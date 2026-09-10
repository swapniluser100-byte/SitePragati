// GET /api/admin/ticket-file?key=...&name=... — protected by _middleware.js
// Streams a file back from R2 for download. Admin can access any file.

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const name = (url.searchParams.get('name') || 'file').replace(/"/g, '');

  if (!key) return new Response('Missing key', { status: 400 });

  const obj = await env.TICKET_FILES.get(key);
  if (!obj) return new Response('File not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('Content-Disposition', `attachment; filename="${name}"`);

  return new Response(obj.body, { headers });
}
