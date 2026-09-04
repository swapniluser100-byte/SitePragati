// Cloudflare Pages middleware — runs before every request under
// /functions/api/customer/*. Blocks access unless a valid customer
// session cookie is present (except for the login endpoint itself),
// and attaches the verified customerId so ticket handlers can use it
// without trusting anything the client sends.

import { verifySessionToken, getCookieValue, json } from '../../_utils/auth.js';

export async function onRequest(context) {
  const { request, env, next, data } = context;
  const url = new URL(request.url);

  if (url.pathname === '/api/customer/login') {
    return next();
  }

  const token = getCookieValue(request, 'customer_session');
  const payload = token && await verifySessionToken(token, env.SESSION_SECRET);

  if (!payload || payload.role !== 'customer' || !payload.customerId) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // Available to downstream handlers via context.data.customerId
  data.customerId = payload.customerId;

  return next();
}
