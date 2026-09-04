// POST /api/admin/logout — clears the session cookie.

import { clearSessionCookie, json } from '../../_utils/auth.js';

export async function onRequestPost(context) {
  return json({ result: 'success' }, 200, { 'Set-Cookie': clearSessionCookie() });
}
