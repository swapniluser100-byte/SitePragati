// POST /api/admin/forgot-password — no body needed, since there's only
// one admin account. Generates a one-hour reset token, stores it, and
// emails a reset link to NOTIFY_EMAIL (the same inbox every other admin
// notification already goes to — there's no separate "recovery email"
// to collect for a single-admin console).
//
// Always returns success, whether or not NOTIFY_EMAIL/RESEND_API_KEY
// are configured — the login screen has no way to tell you apart from
// anyone else who finds it, so it shouldn't reveal whether email is set
// up at all.

import { json, generateRandomId } from '../../_utils/auth.js';
import { brandedEmailHtml, sendResendEmail } from '../../_utils/email.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (env.NOTIFY_EMAIL) {
      const token = generateRandomId(32);
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      await env.DB.prepare(
        `INSERT INTO admin_auth (id, reset_token, reset_token_expires) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET reset_token = excluded.reset_token, reset_token_expires = excluded.reset_token_expires`
      ).bind(token, expires).run();

      const resetUrl = `${new URL(request.url).origin}/portal.html?admin_reset_token=${encodeURIComponent(token)}`;
      const html = brandedEmailHtml({
        badgeText: 'Password reset',
        introText: "Someone requested a password reset for your SitePragati admin console. If this was you, use the button below to set a new password — it expires in 1 hour.",
        rows: [],
        ctaText: 'Set a new password',
        ctaUrl: resetUrl,
        footerText: "If you didn't request this, you can ignore this email — your password won't change unless that link is used."
      });

      await sendResendEmail(env, {
        to: env.NOTIFY_EMAIL,
        subject: 'Reset your SitePragati admin password',
        text: `Reset your admin password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
        html
      });
    }

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
