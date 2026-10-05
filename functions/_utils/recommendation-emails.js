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

// The Details field is rich-text HTML (authored via the admin console's
// TinyMCE editor) — this strips it down to plain text for the email's
// text/plain fallback, which can't render markup.
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim();
}

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
      `${rec.name}\n${stripHtml(rec.details)}\n\n` +
      `Log in to your customer portal to view this and any other recommendations: ${portalUrl}`;

    const html = brandedEmailHtml({
      badgeText: 'New recommendation',
      introText: `Hi ${rec.business_name}, we've been reviewing your website and have a new recommendation we think could help your business — take a look below, and let us know if you'd like help putting it in place.`,
      rows: [
        ['Recommendation', rec.name]
      ],
      ctaText: 'View in your portal',
      ctaUrl: portalUrl,
      footerText: 'Log in to your customer portal any time to see this and any other recommendations.',
      extraHtml: rec.details ? `
        <div style="margin-top:18px;">
          <p style="font-size:13px; font-weight:600; color:#545B70; margin:0 0 8px;">Why it helps</p>
          <div style="font-size:14px; color:#1B2544; line-height:1.6;">${rec.details}</div>
        </div>` : ''
    });

    await sendResendEmail(env, { to: rec.email, subject: emailSubject, text: bodyText, html });
    sent++;
  }

  return sent;
}
