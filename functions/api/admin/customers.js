// /api/admin/customers — protected by _middleware.js
// GET    → list all customers
// POST   → create a new one
// PUT    → { id, ...fields } → update an existing one
// DELETE → { id } → remove one (also removes their transactions, via
//          ON DELETE CASCADE in the schema)

import { json } from '../../_utils/auth.js';

const FIELDS = [
  'business_name', 'contact_name', 'phone', 'address',
  'next_payment_due_date', 'next_payment_due_amount'
];

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM customers ORDER BY business_name ASC'
    ).all();
    return json({ customers: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (!body.business_name) return json({ error: 'business_name is required' }, 400);

    const values = FIELDS.map(f => body[f] ?? null);
    const placeholders = FIELDS.map(() => '?').join(', ');

    const result = await env.DB.prepare(
      `INSERT INTO customers (${FIELDS.join(', ')}) VALUES (${placeholders})`
    ).bind(...values).run();

    return json({ result: 'success', id: result.meta.last_row_id });
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
      `UPDATE customers SET ${setClause} WHERE id = ?`
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

    // Remove their transactions first (explicit, in case FK cascade
    // isn't enforced depending on D1's pragma settings)
    await env.DB.prepare('DELETE FROM transactions WHERE customer_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM customers WHERE id = ?').bind(id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
