// Sends the "new recommendation" email for any recommendation that's now
// due — either created with no visible_after (immediate), or whose
// visible_after date has arrived — but hasn't been emailed yet.
//
// Cloudflare Pages has no built-in cron scheduler, so this doesn't run on
// a timer. Instead it's piggybacked onto /api/whoami, which the portal
// calls on every page load/session check — so a due recommendation goes
// out the next time anyone (admin or customer) opens the app, rather
// than at a guaranteed exact time.

import { brandedEmailHtml, sendResendEmail } from './email.js';

export async function sendDueRecommendationEmails(env, origin) {
  const today = new Date().toISOString().slice(0, 10);

  const { results: due } = await env.DB.prepare(`
    SELECT recommendations.id, recommendations.name, recommendations.details,
           customers.business_name, customers.email
    FROM recommendations
    JOIN customers ON customers.id = recommendations.customer_id
    WHERE recommendations.email_sent_at IS NULL
      AND (recommendations.visible_after IS NULL OR recommendations.visible_after <= ?)
      AND customers.email IS NOT NULL AND customers.email != ''
  `).bind(today).all();

  let sent = 0;
  for (const rec of due) {
    // Claim it first (guarded by email_sent_at IS NULL) so a concurrent
    // request landing at the same moment can't send it twice.
    const claim = await env.DB.prepare(
      'UPDATE recommendations SET email_sent_at = ? WHERE id = ? AND email_sent_at IS NULL'
    ).bind(new Date().toISOString(), rec.id).run();
    if (claim.meta.changes === 0) continue;

    const portalUrl = `${origin}/portal.html`;
    const emailSubject = `A new recommendation for ${rec.business_name}: ${rec.name}`;
    const bodyText =
      `Hi ${rec.business_name}, our team has a new recommendation to help improve your website:\n\n` +
      `${rec.name}\n${rec.details || ''}\n\n` +
      `Log in to your customer portal to view this and any other recommendations: ${portalUrl}`;

    const html = brandedEmailHtml({
      badgeText: 'New recommendation',
      introText: `Hi ${rec.business_name}, we've been reviewing your website and have a new recommendation we think could help your business — take a look below, and let us know if you'd like help putting it in place.`,
      rows: [
        ['Recommendation', rec.name],
        ['Why it helps', rec.details || '']
      ],
      ctaText: 'View in your portal',
      ctaUrl: portalUrl,
      footerText: 'Log in to your customer portal any time to see this and any other recommendations.'
    });

    await sendResendEmail(env, { to: rec.email, subject: emailSubject, text: bodyText, html });
    sent++;
  }

  return sent;
}
