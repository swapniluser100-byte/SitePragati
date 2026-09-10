// /api/admin/ticket-comments — protected by _middleware.js
// GET  ?ticket_id=X → list all comments on a ticket, oldest first
// POST → multipart form { ticket_id, comment, file? } → add a comment
//        as the admin, optionally with a file uploaded to R2

import { json } from '../../_utils/auth.js';
import { brandedEmailHtml, sendResendEmail } from '../../_utils/email.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const ticketId = url.searchParams.get('ticket_id');
  if (!ticketId) return json({ error: 'ticket_id is required' }, 400);

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC'
    ).bind(ticketId).all();
    return json({ comments: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const formData = await request.formData();
    const ticketId = formData.get('ticket_id');
    const comment = (formData.get('comment') || '').toString().trim();
    const file = formData.get('file');
    const hasFile = file && typeof file === 'object' && file.size > 0;

    if (!ticketId) return json({ error: 'ticket_id is required' }, 400);
    if (!comment && !hasFile) return json({ error: 'Add a comment or attach a file' }, 400);

    let fileKey = null;
    let fileName = null;

    if (hasFile) {
      fileKey = `ticket-${ticketId}/${Date.now()}-${file.name}`;
      await env.TICKET_FILES.put(fileKey, file.stream(), {
        httpMetadata: { contentType: file.type || 'application/octet-stream' }
      });
      fileName = file.name;
    }

    await env.DB.prepare(
      `INSERT INTO ticket_comments (ticket_id, author_type, author_name, comment, file_key, file_name)
       VALUES (?, 'admin', 'SitePragati', ?, ?, ?)`
    ).bind(ticketId, comment, fileKey, fileName).run();

    // Notify the customer that admin replied
    const row = await env.DB.prepare(`
      SELECT tickets.subject, customers.email, customers.business_name
      FROM tickets JOIN customers ON customers.id = tickets.customer_id
      WHERE tickets.id = ?
    `).bind(ticketId).first();

    if (row && row.email) {
      const html = brandedEmailHtml({
        badgeText: 'New reply',
        introText: `Hi ${row.business_name}, SitePragati replied to your ticket.`,
        rows: [
          ['Ticket', row.subject],
          ['Message', comment || '(file attached, no message)'],
          hasFile ? ['Attachment', fileName] : null
        ].filter(Boolean),
        footerText: 'Log in to your customer portal to view the full conversation.'
      });
      await sendResendEmail(env, {
        to: row.email,
        subject: `New reply on your ticket: ${row.subject}`,
        text: `SitePragati replied to your ticket "${row.subject}":\n\n${comment || '(file attached)'}`,
        html
      });
    }

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
