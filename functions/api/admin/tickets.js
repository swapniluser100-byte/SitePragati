// /api/admin/tickets — protected by _middleware.js
// GET   → list all tickets, joined with the customer's business name
// PATCH → { id, status } → update a ticket's status, and emails the
//         customer a branded notification (if they have an email on file)

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
    const { id, status } = await request.json();
    if (!id || !status) return json({ error: 'id and status are required' }, 400);

    await env.DB.prepare('UPDATE tickets SET status = ? WHERE id = ?')
      .bind(status, id).run();

    // Look up the ticket + the customer's email to notify them
    const row = await env.DB.prepare(`
      SELECT tickets.subject, tickets.description, customers.email, customers.business_name
      FROM tickets
      JOIN customers ON customers.id = tickets.customer_id
      WHERE tickets.id = ?
    `).bind(id).first();

    if (row && row.email) {
      const emailSubject = `Your ticket status is now "${status}": ${row.subject}`;
      const bodyText =
        `Your support ticket has been updated:\n\n` +
        `Subject: ${row.subject}\nNew status: ${status}`;

      const html = brandedEmailHtml({
        badgeText: 'Ticket update',
        introText: `Hi ${row.business_name}, your support ticket has been updated.`,
        rows: [
          ['Subject', row.subject],
          ['New status', status],
          ['Description', row.description]
        ],
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
