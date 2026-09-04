// /api/customer/tickets — protected by _middleware.js, which sets
// context.data.customerId from the verified session (never trust a
// customer_id sent by the client for this endpoint).
//
// GET  → list only this customer's tickets
// POST → { subject, description } → create a new ticket for this customer

import { json } from '../../_utils/auth.js';

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

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
