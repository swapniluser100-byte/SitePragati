// GET /api/customer/recommendations — protected by _middleware.js, which
// sets context.data.customerId from the verified session (never trust a
// customer_id sent by the client for this endpoint).
//
// Read-only: lets a customer see the recommendations their admin has
// written for them. Adding/editing/deleting stays an admin-only action.
//
// Only recommendations whose visible_after date has arrived (or has none
// set) are returned — one with a future visible_after is hidden from the
// customer entirely until that date, same as the "new recommendation"
// email is held back until then (functions/_utils/recommendation-emails.js).

import { json } from '../../_utils/auth.js';

export async function onRequestGet(context) {
  const { env, data } = context;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { results } = await env.DB.prepare(
      `SELECT id, name, details, converted_ticket_id FROM recommendations
       WHERE customer_id = ? AND (visible_after IS NULL OR visible_after <= ?)
       ORDER BY id DESC`
    ).bind(data.customerId, today).all();
    return json({ recommendations: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
