// POST /api/admin/reset-password — { token, password } → sets a new
// admin password if the token matches the one from a recent
// "Forgot password?" email and hasn't expired. From this point on,
// login checks this stored hash instead of the ADMIN_PASSWORD secret.

import { json, hashPassword } from '../../_utils/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { token, password } = await request.json();
    if (!token || !password) return json({ error: 'Token and new password are required' }, 400);
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);

    const row = await env.DB.prepare('SELECT reset_token, reset_token_expires FROM admin_auth WHERE id = 1').first();
    if (!row || !row.reset_token || row.reset_token !== token) {
      return json({ error: 'This reset link is invalid. Please request a new one.' }, 400);
    }
    if (!row.reset_token_expires || new Date(row.reset_token_expires) < new Date()) {
      return json({ error: 'This reset link has expired. Please request a new one.' }, 400);
    }

    const passwordHash = await hashPassword(password);
    await env.DB.prepare(
      `UPDATE admin_auth SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = 1`
    ).bind(passwordHash).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
