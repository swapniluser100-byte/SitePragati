// /api/admin/tickets — protected by _middleware.js
// GET   → list all tickets, joined with the customer's business name
// PATCH → { id, status } → update a ticket's status

import { json } from '../../_utils/auth.js';

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

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
