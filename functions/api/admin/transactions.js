// /api/admin/transactions — protected by _middleware.js
// GET    ?customer_id=X → list transactions for one customer, newest first
// POST   → create a new transaction { customer_id, amount, transaction_date, description, status }
// PUT    → { id, ...fields } → update an existing transaction
// DELETE → { id } → remove one

import { json } from '../../_utils/auth.js';

const FIELDS = ['customer_id', 'amount', 'transaction_date', 'description', 'status'];

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customer_id');

    if (!customerId) return json({ error: 'customer_id query param is required' }, 400);

    const { results } = await env.DB.prepare(
      'SELECT * FROM transactions WHERE customer_id = ? ORDER BY transaction_date DESC, id DESC'
    ).bind(customerId).all();

    return json({ transactions: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (!body.customer_id || !body.amount) {
      return json({ error: 'customer_id and amount are required' }, 400);
    }

    const values = FIELDS.map(f => body[f] ?? null);
    const placeholders = FIELDS.map(() => '?').join(', ');

    await env.DB.prepare(
      `INSERT INTO transactions (${FIELDS.join(', ')}) VALUES (${placeholders})`
    ).bind(...values).run();

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

    const setClause = FIELDS.map(f => `${f} = ?`).join(', ');
    const values = FIELDS.map(f => body[f] ?? null);

    await env.DB.prepare(
      `UPDATE transactions SET ${setClause} WHERE id = ?`
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

    await env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
