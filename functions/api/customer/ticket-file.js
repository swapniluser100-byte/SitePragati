// GET /api/customer/ticket-file?key=...&name=... — protected by
// _middleware.js. Streams a file back from R2, but ONLY if that file
// belongs to a comment on a ticket owned by the logged-in customer —
// checked at the database level, not just by having a valid session.

import { json } from '../../_utils/auth.js';

export async function onRequestGet(context) {
  const { request, env, data } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const name = (url.searchParams.get('name') || 'file').replace(/"/g, '');

  if (!key) return new Response('Missing key', { status: 400 });

  const owns = await env.DB.prepare(`
    SELECT ticket_comments.id
    FROM ticket_comments
    JOIN tickets ON tickets.id = ticket_comments.ticket_id
    WHERE ticket_comments.file_key = ? AND tickets.customer_id = ?
  `).bind(key, data.customerId).first();

  if (!owns) return json({ error: 'Not found' }, 404);

  const obj = await env.TICKET_FILES.get(key);
  if (!obj) return new Response('File not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('Content-Disposition', `attachment; filename="${name}"`);

  return new Response(obj.body, { headers });
}
