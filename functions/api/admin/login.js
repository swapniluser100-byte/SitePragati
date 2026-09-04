// POST /api/admin/login — { password } → sets a signed session cookie
// if it matches ADMIN_PASSWORD.

import { createSessionToken, sessionCookie, json } from '../../_utils/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { password } = await request.json();

    if (!password || password !== env.ADMIN_PASSWORD) {
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
