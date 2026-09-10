// /api/admin/tickets — protected by _middleware.js
// GET   → list all tickets, joined with the customer's business name
// PATCH → { id, status, payment_amount? } → update a ticket's status
//         (and the amount due, when status is "Payment Pending"), and
//         emails the customer a branded notification

import { json } from '../../_utils/auth.js';
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
    } else {
      await env.DB.prepare('UPDATE tickets SET status = ? WHERE id = ?')
        .bind(status, id).run();
    }

    // Look up the ticket + the customer's email to notify them
    const row = await env.DB.prepare(`
      SELECT tickets.subject, tickets.description, tickets.payment_amount, customers.email, customers.business_name
      FROM tickets
      JOIN customers ON customers.id = tickets.customer_id
      WHERE tickets.id = ?
    `).bind(id).first();

    if (row && row.email) {
      const isPaymentPending = status === 'Payment Pending';
      const emailSubject = isPaymentPending
        ? `Payment needed for your ticket: ${row.subject}`
        : `Your ticket status is now "${status}": ${row.subject}`;

      const bodyText =
        `Your support ticket has been updated:\n\n` +
        `Subject: ${row.subject}\nNew status: ${status}` +
        (isPaymentPending ? `\nAmount due: ₹${row.payment_amount}` : '');

      const html = brandedEmailHtml({
        badgeText: isPaymentPending ? 'Payment needed' : 'Ticket update',
        introText: isPaymentPending
          ? `Hi ${row.business_name}, a payment is needed to proceed with your ticket. Log in to your customer portal to view the QR code and pay.`
          : `Hi ${row.business_name}, your support ticket has been updated.`,
        rows: [
          ['Subject', row.subject],
          ['New status', status],
          isPaymentPending ? ['Amount due', `₹${row.payment_amount}`] : null,
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
