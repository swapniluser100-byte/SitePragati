// Public, unauthenticated endpoint so another application can look up a
// customer's next renewal by their unique_id.
//
// GET ?customerId=<unique_id> -> { business_name, frequency,
//   next_payment_due_date, next_payment_due_amount, upi_id }
//
// Renewal info now comes from the `renewals` table (added for the
// admin console's Renewal tab) — specifically the customer's nearest
// still-Pending renewal — rather than the old ad-hoc fields on
// customers. If a customer has no pending renewal on file, those
// three fields come back null.
//
// customerId here is always the customer's public `unique_id` (a random
// 15-char string from generateRandomId, shown in the admin Customers
// tab) — never the internal numeric `id` — so this can't be used to
// enumerate or address other customers. No API key is required; the
// unique_id itself is the only access control, and the response is
// deliberately limited to renewal info — no email, phone, address, or
// the internal notes field.

import { json } from '../../_utils/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const uniqueId = (url.searchParams.get('customerId') || '').trim();

  if (!uniqueId) return json({ error: 'customerId is required' }, 400);

  const customer = await env.DB.prepare(
    'SELECT id, business_name FROM customers WHERE unique_id = ?'
  ).bind(uniqueId).first();

  if (!customer) return json({ error: 'Customer not found' }, 404);

  const renewal = await env.DB.prepare(
    `SELECT frequency, due_date, amount FROM renewals
     WHERE customer_id = ? AND status = 'Pending'
     ORDER BY due_date ASC LIMIT 1`
  ).bind(customer.id).first();

  return json({
    business_name: customer.business_name,
    frequency: renewal ? renewal.frequency : null,
    next_payment_due_date: renewal ? renewal.due_date : null,
    next_payment_due_amount: renewal ? renewal.amount : null,
    upi_id: env.PAYMENT_UPI_ID || null
  });
}
