// POST /api/customer/login — { email, password } → sets a signed
// customer session cookie if credentials match a row in "customers".

import { createSessionToken, sessionCookie, verifyPassword, json } from '../../_utils/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return json({ error: 'Email and password are required' }, 400);
    }

    const customer = await env.DB.prepare(
      'SELECT id, business_name, password_hash FROM customers WHERE email = ?'
    ).bind(email.trim().toLowerCase()).first();

    if (!customer || !customer.password_hash) {
      return json({ error: 'Incorrect email or password' }, 401);
    }

    const valid = await verifyPassword(password, customer.password_hash);
    if (!valid) {
      return json({ error: 'Incorrect email or password' }, 401);
    }

    const token = await createSessionToken(env.SESSION_SECRET, {
      role: 'customer',
      customerId: customer.id
    });

    return json(
      { result: 'success', businessName: customer.business_name },
      200,
      { 'Set-Cookie': sessionCookie('customer_session', token) }
    );
  } catch (err) {
    return json({ error: 'Login failed' }, 400);
  }
}
