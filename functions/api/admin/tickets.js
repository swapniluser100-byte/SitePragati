// /api/admin/tickets — protected by _middleware.js
// GET   → list all tickets, joined with the customer's business name
// POST  → { customer_id, subject, description } → raise a ticket on a
//         customer's behalf (e.g. a phone request), and emails that
//         customer a notification if they have an email on file
// PUT   → { id, subject, description } → edit a ticket's subject/details.
//         Status changes go through PATCH instead (they carry payment
//         and email side effects this endpoint doesn't touch).
// PATCH → { id, status, payment_amount? } → update a ticket's status
//         (and the amount due, when status is "Payment Pending"), and
//         emails the customer a branded notification.
//         Setting status to "Payment Received" also automatically
//         creates a matching transaction for that customer — once only,
//         even if the status is set to Payment Received more than once.

import { json, generateUniqueTicketCode } from '../../_utils/auth.js';
import { brandedEmailHtml, sendResendEmail } from '../../_utils/email.js';

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(`
      SELECT tickets.*, customers.business_name
      FROM tickets
      JOIN customers ON customers.id = tickets.customer_id
      ORDER BY tickets.created_at DESC
    `).all();
    return json({ tickets: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const customerId = Number(body.customer_id);
    const subject = (body.subject || '').toString().trim();
    const description = (body.description || '').toString().trim();

    if (!customerId) return json({ error: 'customer_id is required' }, 400);
    if (!subject) return json({ error: 'subject is required' }, 400);

    const customer = await env.DB.prepare(
      'SELECT business_name, email FROM customers WHERE id = ?'
    ).bind(customerId).first();
    if (!customer) return json({ error: 'Customer not found' }, 404);

    const referenceCode = await generateUniqueTicketCode(env);
    const result = await env.DB.prepare(
      `INSERT INTO tickets (customer_id, subject, description, status, reference_code)
       VALUES (?, ?, ?, 'Open', ?)`
    ).bind(customerId, subject, description, referenceCode).run();

    if (customer.email) {
      const emailSubject = `A support ticket was raised for you: ${subject}`;
      const bodyText =
        `A ticket has been raised on your behalf:\n\n` +
        `Request #: ${referenceCode}\nSubject: ${subject}\nDescription: ${description}\nStatus: Open`;

      const html = brandedEmailHtml({
        badgeText: 'New ticket',
        introText: `Hi ${customer.business_name}, we've raised a support ticket for you.`,
        rows: [
          ['Request #', referenceCode],
          ['Subject', subject],
          ['Description', description],
          ['Status', 'Open']
        ],
        footerText: 'Log in to your customer portal to view or follow up on this ticket.'
      });

      await sendResendEmail(env, { to: customer.email, subject: emailSubject, text: bodyText, html });
      // Ticket is already saved in D1 regardless of whether the email succeeds.
    }

    return json({ result: 'success', id: result.meta.last_row_id, reference_code: referenceCode });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (!body.id) return json({ error: 'id is required' }, 400);
    const subject = (body.subject || '').trim();
    if (!subject) return json({ error: 'subject is required' }, 400);

    // Backfill a reference_code for older tickets that predate this
    // feature — generated once, then left alone on every future edit.
    const existing = await env.DB.prepare('SELECT reference_code FROM tickets WHERE id = ?').bind(body.id).first();
    const referenceCode = (existing && existing.reference_code) ? existing.reference_code : await generateUniqueTicketCode(env);

    await env.DB.prepare('UPDATE tickets SET subject = ?, description = ?, reference_code = ? WHERE id = ?')
      .bind(subject, body.description || null, referenceCode, body.id).run();

    return json({ result: 'success', reference_code: referenceCode });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  try {
    const { id, status, payment_amount } = await request.json();
    if (!id || !status) return json({ error: 'id and status are required' }, 400);

    if (status === 'Payment Pending') {
      if (!payment_amount || Number(payment_amount) <= 0) {
        return json({ error: 'A payment amount is required when setting status to Payment Pending' }, 400);
      }
      // Setting a new amount due also clears any previous reference — this
      // is a fresh payment request, not a continuation of an old one.
      await env.DB.prepare('UPDATE tickets SET status = ?, payment_amount = ?, payment_reference = NULL WHERE id = ?')
        .bind(status, Number(payment_amount), id).run();
    } else if (status === 'Payment Received') {
      // Validate BEFORE changing anything — a ticket with no amount due
      // should never end up in "Payment Received" state.
      const current = await env.DB.prepare(
        'SELECT payment_amount FROM tickets WHERE id = ?'
      ).bind(id).first();

      if (!current || !current.payment_amount) {
        return json({ error: 'This ticket has no amount due — set status to Payment Pending with an amount first.' }, 400);
      }

      await env.DB.prepare('UPDATE tickets SET status = ? WHERE id = ?')
        .bind(status, id).run();
    } else {
      await env.DB.prepare('UPDATE tickets SET status = ? WHERE id = ?')
        .bind(status, id).run();
    }

    // Look up the ticket + the customer's email/id to notify them and,
    // if applicable, create the transaction.
    const row = await env.DB.prepare(`
      SELECT tickets.subject, tickets.description, tickets.payment_amount,
             tickets.payment_reference, tickets.customer_id,
             customers.email, customers.business_name
      FROM tickets
      JOIN customers ON customers.id = tickets.customer_id
      WHERE tickets.id = ?
    `).bind(id).first();

    if (status === 'Payment Received' && row) {
      // Only create a transaction the first time this ticket reaches
      // Payment Received — re-selecting it later won't double-count.
      const existing = await env.DB.prepare(
        'SELECT id FROM transactions WHERE ticket_id = ?'
      ).bind(id).first();

      if (!existing) {
        const today = new Date().toISOString().slice(0, 10);
        const description = `Payment for ticket: ${row.subject}` +
          (row.payment_reference ? ` (ref: ${row.payment_reference})` : '');

        await env.DB.prepare(
          `INSERT INTO transactions (customer_id, amount, transaction_date, description, status, ticket_id)
           VALUES (?, ?, ?, ?, 'Paid', ?)`
        ).bind(row.customer_id, row.payment_amount, today, description, id).run();
      }
    }

    if (row && row.email) {
      const isPaymentPending = status === 'Payment Pending';
      const isPaymentReceived = status === 'Payment Received';
      const emailSubject = isPaymentPending
        ? `Payment needed for your ticket: ${row.subject}`
        : `Your ticket status is now "${status}": ${row.subject}`;

      const bodyText =
        `Your support ticket has been updated:\n\n` +
        `Subject: ${row.subject}\nNew status: ${status}` +
        (isPaymentPending || isPaymentReceived ? `\nAmount: ₹${row.payment_amount}` : '');

      const html = brandedEmailHtml({
        badgeText: isPaymentPending ? 'Payment needed' : (isPaymentReceived ? 'Payment confirmed' : 'Ticket update'),
        introText: isPaymentPending
          ? `Hi ${row.business_name}, a payment is needed to proceed with your ticket. Log in to your customer portal to view the QR code and pay.`
          : (isPaymentReceived
            ? `Hi ${row.business_name}, we've confirmed your payment — thank you!`
            : `Hi ${row.business_name}, your support ticket has been updated.`),
        rows: [
          ['Subject', row.subject],
          ['New status', status],
          (isPaymentPending || isPaymentReceived) ? ['Amount', `₹${row.payment_amount}`] : null,
          ['Description', row.description]
        ].filter(Boolean),
        footerText: 'Log in to your customer portal to view all your tickets.'
      });

      await sendResendEmail(env, { to: row.email, subject: emailSubject, text: bodyText, html });
      // Status is already updated in D1 regardless of whether the email succeeds.
    }

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
