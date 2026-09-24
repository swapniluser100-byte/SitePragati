// Public, unauthenticated endpoint so another application can look up a
// customer's renewal info by their unique_id.
//
// GET ?customerId=<unique_id> -> { business_name, next_payment_due_date,
//   next_payment_due_amount, upi_id }
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
    'SELECT business_name, next_payment_due_date, next_payment_due_amount FROM customers WHERE unique_id = ?'
  ).bind(uniqueId).first();

  if (!customer) return json({ error: 'Customer not found' }, 404);

  return json({
    business_name: customer.business_name,
    next_payment_due_date: customer.next_payment_due_date,
    next_payment_due_amount: customer.next_payment_due_amount,
    upi_id: env.PAYMENT_UPI_ID || null
  });
}
