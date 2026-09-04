// Cloudflare Pages middleware — runs before every request under
// /functions/api/admin/*. Blocks access unless a valid session cookie
// is present, except for the login endpoint itself.

import { verifySessionToken, getCookieValue, json } from '../../_utils/auth.js';

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Let the login request through without a session — that's how you get one.
  if (url.pathname === '/api/admin/login') {
    return next();
  }

  const token = getCookieValue(request, 'admin_session');
  const valid = token && await verifySessionToken(token, env.SESSION_SECRET);

  if (!valid) {
    return json({ error: 'Unauthorized' }, 401);
  }

  return next();
}
