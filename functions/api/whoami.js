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
    let renewalRequired = true; // safest default — don't show subscription upsell if this lookup fails
    let subscriptionPlans = null;
    let upiId = null;
    try {
      const row = await env.DB.prepare('SELECT business_name, renewal_required, subscription_plans, upi_id FROM customers WHERE id = ?')
        .bind(customerPayload.customerId).first();
      if (row) {
        businessName = row.business_name;
        renewalRequired = !!row.renewal_required;
        upiId = row.upi_id || null;
        if (!renewalRequired && row.subscription_plans) {
          try {
            subscriptionPlans = JSON.parse(row.subscription_plans);
          } catch (err) {
            subscriptionPlans = null;
          }
        }
      }
    } catch (err) {
      // Non-critical — the dashboard still loads fine without the welcome name.
    }
    return json({ role: 'customer', customerId: customerPayload.customerId, businessName, renewalRequired, subscriptionPlans, upiId });
  }

  return json({ role: null });
}
