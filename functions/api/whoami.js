// GET /api/whoami — checks both admin_session and customer_session
// cookies and reports which one (if either) is currently valid. This is
// intentionally NOT behind the admin/customer middleware — it's what
// lets the unified portal figure out which dashboard to show on load,
// before knowing which kind of session exists yet.

import { verifySessionToken, getCookieValue, json } from '../_utils/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  const adminToken = getCookieValue(request, 'admin_session');
  const adminPayload = adminToken && await verifySessionToken(adminToken, env.SESSION_SECRET);
  if (adminPayload && adminPayload.role === 'admin') {
    return json({ role: 'admin' });
  }

  const customerToken = getCookieValue(request, 'customer_session');
  const customerPayload = customerToken && await verifySessionToken(customerToken, env.SESSION_SECRET);
  if (customerPayload && customerPayload.role === 'customer') {
    let businessName = null;
    try {
      const row = await env.DB.prepare('SELECT business_name FROM customers WHERE id = ?')
        .bind(customerPayload.customerId).first();
      businessName = row ? row.business_name : null;
    } catch (err) {
      // Non-critical — the dashboard still loads fine without the welcome name.
    }
    return json({ role: 'customer', customerId: customerPayload.customerId, businessName });
  }

  return json({ role: null });
}
