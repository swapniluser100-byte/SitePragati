// /api/admin/leads — protected by _middleware.js
// GET    → list all leads, newest first
// PATCH  → { id, status } → update a lead's status
// DELETE → { id } → remove a lead

import { json } from '../../_utils/auth.js';

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM leads ORDER BY created_at DESC'
    ).all();
    return json({ leads: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  try {
    const { id, status } = await request.json();
    if (!id || !status) return json({ error: 'id and status are required' }, 400);

    await env.DB.prepare('UPDATE leads SET status = ? WHERE id = ?')
      .bind(status, id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  try {
    const { id } = await request.json();
    if (!id) return json({ error: 'id is required' }, 400);

    await env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
