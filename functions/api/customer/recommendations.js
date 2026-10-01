// GET /api/customer/recommendations — protected by _middleware.js, which
// sets context.data.customerId from the verified session (never trust a
// customer_id sent by the client for this endpoint).
//
// Read-only: lets a customer see the recommendations their admin has
// written for them. Adding/editing/deleting stays an admin-only action.

import { json } from '../../_utils/auth.js';

export async function onRequestGet(context) {
  const { env, data } = context;
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, name, details, converted_ticket_id FROM recommendations WHERE customer_id = ? ORDER BY id DESC'
    ).bind(data.customerId).all();
    return json({ recommendations: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
