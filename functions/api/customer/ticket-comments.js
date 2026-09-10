// /api/customer/ticket-comments — protected by _middleware.js, which
// sets context.data.customerId from the verified session.
//
// GET  ?ticket_id=X → list comments, but ONLY if that ticket belongs to
//      the logged-in customer
// POST → multipart form { ticket_id, comment, file? } → add a comment,
//        again only if the ticket belongs to this customer

import { json } from '../../_utils/auth.js';
import { brandedEmailHtml, sendResendEmail } from '../../_utils/email.js';

async function verifyOwnTicket(env, ticketId, customerId) {
  return env.DB.prepare(
    'SELECT id FROM tickets WHERE id = ? AND customer_id = ?'
  ).bind(ticketId, customerId).first();
}

export async function onRequestGet(context) {
  const { request, env, data } = context;
  const url = new URL(request.url);
  const ticketId = url.searchParams.get('ticket_id');
  if (!ticketId) return json({ error: 'ticket_id is required' }, 400);

  try {
    const ticket = await verifyOwnTicket(env, ticketId, data.customerId);
    if (!ticket) return json({ error: 'Ticket not found' }, 404);

    const { results } = await env.DB.prepare(
      'SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC'
    ).bind(ticketId).all();
    return json({ comments: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  try {
    const formData = await request.formData();
    const ticketId = formData.get('ticket_id');
    const comment = (formData.get('comment') || '').toString().trim();
    const file = formData.get('file');
    const hasFile = file && typeof file === 'object' && file.size > 0;

    if (!ticketId) return json({ error: 'ticket_id is required' }, 400);

    const ticket = await verifyOwnTicket(env, ticketId, data.customerId);
    if (!ticket) return json({ error: 'Ticket not found' }, 404);
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

    const customer = await env.DB.prepare(
      'SELECT business_name FROM customers WHERE id = ?'
    ).bind(data.customerId).first();
    const authorName = customer ? customer.business_name : 'Customer';

    await env.DB.prepare(
      `INSERT INTO ticket_comments (ticket_id, author_type, author_name, comment, file_key, file_name)
       VALUES (?, 'customer', ?, ?, ?, ?)`
    ).bind(ticketId, authorName, comment, fileKey, fileName).run();

    // Notify the admin that the customer replied
    const ticketRow = await env.DB.prepare('SELECT subject FROM tickets WHERE id = ?').bind(ticketId).first();

    if (env.NOTIFY_EMAIL && ticketRow) {
      const html = brandedEmailHtml({
        badgeText: 'New reply',
        introText: `${authorName} replied to their ticket.`,
        rows: [
          ['Business', authorName],
          ['Ticket', ticketRow.subject],
          ['Message', comment || '(file attached, no message)'],
          hasFile ? ['Attachment', fileName] : null
        ].filter(Boolean),
        footerText: 'Reply from your admin console → Tickets tab.'
      });
      await sendResendEmail(env, {
        to: env.NOTIFY_EMAIL,
        subject: `New reply from ${authorName}: ${ticketRow.subject}`,
        text: `${authorName} replied to their ticket "${ticketRow.subject}":\n\n${comment || '(file attached)'}`,
        html
      });
    }

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
