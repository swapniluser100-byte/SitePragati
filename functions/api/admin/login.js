// POST /api/admin/login — { password } → sets a signed session cookie
// if it matches the admin password. Checks admin_auth's stored hash
// first (set by a "Forgot password?" reset); if that table has no
// password_hash yet, falls back to comparing directly against the
// ADMIN_PASSWORD secret — so nothing changes here until reset-password
// is actually used for the first time.

import { createSessionToken, sessionCookie, json, verifyPassword } from '../../_utils/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { password } = await request.json();
    if (!password) return json({ error: 'Incorrect password' }, 401);

    const authRow = await env.DB.prepare('SELECT password_hash FROM admin_auth WHERE id = 1').first();
    const passwordOk = authRow && authRow.password_hash
      ? await verifyPassword(password, authRow.password_hash)
      : password === env.ADMIN_PASSWORD;

    if (!passwordOk) {
      return json({ error: 'Incorrect password' }, 401);
    }

    const token = await createSessionToken(env.SESSION_SECRET, { role: 'admin' });
    return json({ result: 'success' }, 200, {
      'Set-Cookie': sessionCookie('admin_session', token)
    });
  } catch (err) {
    return json({ error: 'Login failed' }, 400);
  }
}
