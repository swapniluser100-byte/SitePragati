// Cloudflare Pages middleware — runs before every request under
// /functions/api/admin/*. Blocks access unless a valid session cookie
// is present, except for the login endpoint itself and the
// forgot-password/reset-password endpoints — those exist specifically
// for someone who can't log in yet, so they can't require a session.

import { verifySessionToken, getCookieValue, json } from '../../_utils/auth.js';

const PUBLIC_PATHS = ['/api/admin/login', '/api/admin/forgot-password', '/api/admin/reset-password'];

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next();
  }

  const token = getCookieValue(request, 'admin_session');
  const payload = token && await verifySessionToken(token, env.SESSION_SECRET);

  if (!payload) {
    return json({ error: 'Unauthorized' }, 401);
  }

  return next();
}
