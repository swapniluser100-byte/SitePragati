// /api/admin/customers — protected by _middleware.js
// GET    → list all customers
// POST   → create a new one (email + password required — this becomes
//          their customer-portal login)
// PUT    → { id, ...fields } → update an existing one. Include a
//          "password" field only when you want to change it — leave it
//          out (or blank) to keep the customer's current password.
// DELETE → { id } → remove one (also removes their transactions and
//          tickets)

import { json, hashPassword, generateRandomId } from '../../_utils/auth.js';

const FIELDS = [
  'business_name', 'contact_name', 'email', 'phone', 'address',
  'next_payment_due_date', 'next_payment_due_amount'
];

export async function onRequestGet(context) {
  const { env } = context;
  try {
    // total_paid is computed live from transactions — never stored, so it
    // can't drift out of sync with the actual transaction history.
    // password_hash is deliberately excluded from what's sent to the browser.
    const { results } = await env.DB.prepare(`
      SELECT
        customers.id, customers.unique_id, customers.business_name, customers.contact_name,
        customers.email, customers.phone, customers.address,
        customers.next_payment_due_date, customers.next_payment_due_amount,
        customers.created_at,
        COALESCE(SUM(CASE WHEN transactions.status = 'Paid' THEN transactions.amount ELSE 0 END), 0) AS total_paid
      FROM customers
      LEFT JOIN transactions ON transactions.customer_id = customers.id
      GROUP BY customers.id
      ORDER BY customers.business_name ASC
    `).all();
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
    if (!body.email) return json({ error: 'email is required (used for portal login)' }, 400);
    if (!body.password) return json({ error: 'password is required for a new customer' }, 400);

    const values = FIELDS.map(f => f === 'email' ? body.email.trim().toLowerCase() : (body[f] ?? null));
    const placeholders = FIELDS.map(() => '?').join(', ');
    const passwordHash = await hashPassword(body.password);

    // System-generated, never client-supplied or editable.
    const uniqueId = generateRandomId(15);

    const result = await env.DB.prepare(
      `INSERT INTO customers (${FIELDS.join(', ')}, password_hash, unique_id) VALUES (${placeholders}, ?, ?)`
    ).bind(...values, passwordHash, uniqueId).run();

    return json({ result: 'success', id: result.meta.last_row_id, unique_id: uniqueId });
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
    const values = FIELDS.map(f => f === 'email' && body.email ? body.email.trim().toLowerCase() : (body[f] ?? null));

    // Backfill a unique_id for older customers that predate this feature —
    // generated once, then left alone on every future edit.
    const existing = await env.DB.prepare('SELECT unique_id FROM customers WHERE id = ?').bind(body.id).first();
    const uniqueId = (existing && existing.unique_id) ? existing.unique_id : generateRandomId(15);

    if (body.password && body.password.trim()) {
      // Password change requested — update it alongside everything else.
      const passwordHash = await hashPassword(body.password);
      await env.DB.prepare(
        `UPDATE customers SET ${setClause}, password_hash = ?, unique_id = ? WHERE id = ?`
      ).bind(...values, passwordHash, uniqueId, body.id).run();
    } else {
      // No password provided — leave the existing one untouched.
      await env.DB.prepare(
        `UPDATE customers SET ${setClause}, unique_id = ? WHERE id = ?`
      ).bind(...values, uniqueId, body.id).run();
    }

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

    // Remove related records first (explicit, in case FK cascade isn't
    // enforced depending on D1's pragma settings)
    await env.DB.prepare('DELETE FROM transactions WHERE customer_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM tickets WHERE customer_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM customers WHERE id = ?').bind(id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
