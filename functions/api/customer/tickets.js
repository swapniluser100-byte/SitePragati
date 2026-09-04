// /api/customer/tickets — protected by _middleware.js, which sets
// context.data.customerId from the verified session (never trust a
// customer_id sent by the client for this endpoint).
//
// GET  → list only this customer's tickets
// POST → { subject, description } → create a new ticket for this customer,
//        and emails the admin (NOTIFY_EMAIL) a branded notification

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
