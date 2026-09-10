// /api/customer/tickets — protected by _middleware.js, which sets
// context.data.customerId from the verified session (never trust a
// customer_id sent by the client for this endpoint).
//
// GET   → list only this customer's tickets
// POST  → { subject, description } → create a new ticket for this customer,
//         and emails the admin (NOTIFY_EMAIL) a branded notification
// PATCH → { id, payment_reference } → submit a transaction reference for a
//         ticket that's awaiting payment. Scoped so a customer can only
//         ever update their OWN ticket — the query includes customer_id
//         from the verified session, not anything the client sends.

import { json } from '../../_utils/auth.js';
import { brandedEmailHtml, sendResendEmail } from '../../_utils/email.js';

export async function onRequestGet(context) {
  const { env, data } = context;
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM tickets WHERE customer_id = ? ORDER BY created_at DESC'
    ).bind(data.customerId).all();
    return json({ tickets: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  try {
    const body = await request.json();
    const subject = (body.subject || '').toString().trim();
    const description = (body.description || '').toString().trim();

    if (!subject) return json({ error: 'Subject is required' }, 400);

    await env.DB.prepare(
      `INSERT INTO tickets (customer_id, subject, description, status)
       VALUES (?, ?, ?, 'Open')`
    ).bind(data.customerId, subject, description).run();

    // Look up the customer's business name for the notification email
    const customer = await env.DB.prepare(
      'SELECT business_name FROM customers WHERE id = ?'
    ).bind(data.customerId).first();
    const businessName = customer ? customer.business_name : 'A customer';

    if (env.NOTIFY_EMAIL) {
      const emailSubject = `New ticket from ${businessName}: ${subject}`;
      const bodyText =
        `A new support ticket was raised through the customer portal:\n\n` +
        `Business: ${businessName}\nSubject: ${subject}\nDescription: ${description}\nStatus: Open`;

      const html = brandedEmailHtml({
        badgeText: 'New ticket',
        introText: `${businessName} raised a new support ticket through the customer portal.`,
        rows: [
          ['Business', businessName],
          ['Subject', subject],
          ['Description', description],
          ['Status', 'Open']
        ],
        footerText: 'Manage this ticket in your admin console → Tickets tab.'
      });

      await sendResendEmail(env, { to: env.NOTIFY_EMAIL, subject: emailSubject, text: bodyText, html });
      // Ticket is already saved in D1 regardless of whether the email succeeds.
    }

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPatch(context) {
  const { request, env, data } = context;
  try {
    const body = await request.json();
    const ticketId = body.id;
    const paymentReference = (body.payment_reference || '').toString().trim();

    if (!ticketId || !paymentReference) {
      return json({ error: 'Ticket id and transaction reference are required' }, 400);
    }

    // Scoped to this customer's own ticket only — customer_id comes from
    // the verified session, never from the request body.
    const ticket = await env.DB.prepare(
      'SELECT id, subject, payment_amount, status FROM tickets WHERE id = ? AND customer_id = ?'
    ).bind(ticketId, data.customerId).first();

    if (!ticket) {
      return json({ error: 'Ticket not found' }, 404);
    }
    if (ticket.status !== 'Payment Pending') {
      return json({ error: 'This ticket is not awaiting payment' }, 400);
    }

    await env.DB.prepare(
      `UPDATE tickets SET payment_reference = ?, status = 'Payment Submitted' WHERE id = ?`
    ).bind(paymentReference, ticketId).run();

    const customer = await env.DB.prepare(
      'SELECT business_name FROM customers WHERE id = ?'
    ).bind(data.customerId).first();
    const businessName = customer ? customer.business_name : 'A customer';

    if (env.NOTIFY_EMAIL) {
      const emailSubject = `Payment submitted by ${businessName} — ref ${paymentReference}`;
      const bodyText =
        `A customer has submitted a payment transaction reference:\n\n` +
        `Business: ${businessName}\nTicket: ${ticket.subject}\n` +
        `Amount due: ₹${ticket.payment_amount}\nTransaction reference: ${paymentReference}`;

      const html = brandedEmailHtml({
        badgeText: 'Payment submitted',
        introText: `${businessName} has submitted a transaction reference for a pending payment. Please verify it before marking the ticket Resolved.`,
        rows: [
          ['Business', businessName],
          ['Ticket', ticket.subject],
          ['Amount due', `₹${ticket.payment_amount}`],
          ['Transaction reference', paymentReference]
        ],
        footerText: 'Verify the payment, then update the ticket status in your admin console → Tickets tab.'
      });

      await sendResendEmail(env, { to: env.NOTIFY_EMAIL, subject: emailSubject, text: bodyText, html });
      // Reference is already saved in D1 regardless of whether the email succeeds.
    }

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
