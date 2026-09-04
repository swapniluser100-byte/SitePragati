// Cloudflare Pages Function
// Lives at: /functions/api/enquiry.js
// Automatically available at: https://yoursite.pages.dev/api/enquiry
//
// On every contact-form submission this:
//   1. Stores the enquiry in the D1 "leads" table
//   2. Sends you a branded email notification via Resend
//
// Requires:
//   - D1 database bound as "DB"
//   - A RESEND_API_KEY secret (set via `wrangler pages secret put RESEND_API_KEY`
//     or the Cloudflare dashboard — see DEPLOY-GUIDE.md)
//   - A NOTIFY_EMAIL environment variable — where the notification is sent

import { brandedEmailHtml, sendResendEmail } from '../_utils/email.js';

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const formData = await request.formData();
    const name = (formData.get('name') || '').toString().trim();
    const business = (formData.get('business') || '').toString().trim();
    const businessType = (formData.get('businessType') || '').toString().trim();
    const contact = (formData.get('contact') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();

    if (!name || !contact) {
      return json({ error: 'Name and contact are required' }, 400);
    }

    // 1. Store in D1
    await env.DB.prepare(
      `INSERT INTO leads (name, business, business_type, contact, message)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(name, business, businessType, contact, message).run();

    // 2. Branded email notification via Resend
    if (env.NOTIFY_EMAIL) {
      const subject = `New enquiry from ${name}${business ? ' (' + business + ')' : ''}`;
      const bodyText =
        `A new enquiry came in through the SitePragati website:\n\n` +
        `Name: ${name}\nBusiness: ${business}\nBusiness type: ${businessType}\n` +
        `Contact: ${contact}\nMessage: ${message}`;

      const html = brandedEmailHtml({
        badgeText: 'New enquiry',
        introText: "You've received a new enquiry through the SitePragati website.",
        rows: [
          ['Name', name],
          ['Business', business],
          ['Business type', businessType],
          ['Contact', contact],
          ['Message', message]
        ],
        footerText: 'Sent automatically from your SitePragati admin backend.'
      });

      await sendResendEmail(env, { to: env.NOTIFY_EMAIL, subject, text: bodyText, html });
      // Lead is already saved in D1 regardless of whether the email succeeds.
    }

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
