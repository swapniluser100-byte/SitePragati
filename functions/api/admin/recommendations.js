// /api/admin/recommendations — protected by _middleware.js
// GET    ?customer_id=X → list recommendations for one customer, newest first
// POST   → create a new recommendation { customer_id, name, details,
//          visible_after }. visible_after is an optional ISO date
//          (YYYY-MM-DD) — leave it blank for the original behavior
//          (visible immediately, emailed immediately); set a future date
//          to hold it back from the customer portal and delay the email
//          until that date (see functions/_utils/recommendation-emails.js)
// PUT    → { id, ...fields } → update an existing recommendation
// DELETE → { id } → remove one

import { json } from '../../_utils/auth.js';
import { sendDueRecommendationEmails } from '../../_utils/recommendation-emails.js';

const FIELDS = ['customer_id', 'name', 'details', 'visible_after'];

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customer_id');

    if (!customerId) return json({ error: 'customer_id query param is required' }, 400);

    const { results } = await env.DB.prepare(
      'SELECT * FROM recommendations WHERE customer_id = ? ORDER BY id DESC'
    ).bind(customerId).all();

    return json({ recommendations: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (!body.customer_id || !body.name) {
      return json({ error: 'customer_id and name are required' }, 400);
    }

    const customer = await env.DB.prepare(
      'SELECT id FROM customers WHERE id = ?'
    ).bind(body.customer_id).first();
    if (!customer) return json({ error: 'Customer not found' }, 404);

    const values = FIELDS.map(f => body[f] ?? null);
    const placeholders = FIELDS.map(() => '?').join(', ');

    await env.DB.prepare(
      `INSERT INTO recommendations (${FIELDS.join(', ')}) VALUES (${placeholders})`
    ).bind(...values).run();

    // Sends immediately if this (or anything else) is due right now — no
    // visible_after, or one that's already today-or-past. Same check the
    // scheduled catch-up uses, so there's one source of truth for "is
    // this due yet" instead of duplicating the email-sending logic here.
    await sendDueRecommendationEmails(env, new URL(request.url).origin);

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (!body.id) return json({ error: 'id is required' }, 400);
    if (!body.name) return json({ error: 'name is required' }, 400);

    const setClause = FIELDS.map(f => `${f} = ?`).join(', ');
    const values = FIELDS.map(f => body[f] ?? null);

    await env.DB.prepare(
      `UPDATE recommendations SET ${setClause} WHERE id = ?`
    ).bind(...values, body.id).run();

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

    await env.DB.prepare('DELETE FROM recommendations WHERE id = ?').bind(id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
