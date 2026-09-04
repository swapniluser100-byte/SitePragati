// Cloudflare Pages Function
// Lives at: /functions/api/enquiry.js
// Automatically available at: https://yoursite.pages.dev/api/enquiry
//
// On every contact-form submission this:
//   1. Stores the enquiry in the D1 "leads" table
//   2. Sends you an email notification via Resend
//
// Requires:
//   - D1 database bound as "DB" (same binding used by case-studies.js)
//   - A RESEND_API_KEY secret (set via `wrangler pages secret put RESEND_API_KEY`
//     or the Cloudflare dashboard — see DEPLOY-GUIDE.md)
//   - A NOTIFY_EMAIL environment variable — where the notification is sent

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

    // 2. Email notification via Resend
    const notifyEmail = env.NOTIFY_EMAIL;
    const resendKey = env.RESEND_API_KEY;

    if (resendKey && notifyEmail) {
      const subject = `New enquiry from ${name}${business ? ' (' + business + ')' : ''}`;
      const bodyText =
        `A new enquiry came in through the SitePragati website:\n\n` +
        `Name: ${name}\n` +
        `Business: ${business}\n` +
        `Business type: ${businessType}\n` +
        `Contact: ${contact}\n` +
        `Message: ${message}`;

      const bodyHtml = buildLeadEmailHtml({ name, business, businessType, contact, message });

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SitePragati <onboarding@resend.dev>', // see DEPLOY-GUIDE.md to use your own domain
          to: [notifyEmail],
          subject: subject,
          text: bodyText,
          html: bodyHtml
        })
      });

      if (!emailRes.ok) {
        // Lead is already saved in D1 even if the email fails — log but don't fail the request
        const errText = await emailRes.text();
        console.error('Resend error:', errText);
      }
    }

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

// Escapes user-supplied values before dropping them into HTML, so a
// name/message containing "<" or "&" can't break the email markup.
function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Branded HTML email — inline styles throughout, since most email clients
// strip <style> blocks or external stylesheets. Wrapped in a minimal
// document with an explicit UTF-8 charset so accented characters and
// symbols (₹, é, etc.) render correctly across email clients.
function buildLeadEmailHtml({ name, business, businessType, contact, message }) {
  const row = (label, value) => value ? `
    <tr>
      <td style="padding:10px 0; border-top:1px solid #EBEDF2; font-size:13px; font-weight:600; color:#545B70; width:140px; vertical-align:top;">${esc(label)}</td>
      <td style="padding:10px 0; border-top:1px solid #EBEDF2; font-size:14px; color:#1B2544; vertical-align:top;">${esc(value)}</td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0;">
  <div style="background:#F5F6F8; padding:32px 16px; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" style="max-width:560px; margin:0 auto; background:#FFFFFF; border-radius:10px; overflow:hidden; border:1px solid #EBEDF2;">
      <tr>
        <td style="background:#1B2544; padding:24px 28px;">
          <span style="font-size:20px; font-weight:700; color:#FFFFFF; letter-spacing:0.2px;">SitePragati</span>
          <span style="font-size:13px; color:#E8A33D; margin-left:8px; font-weight:600;">New enquiry</span>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 18px; font-size:14px; color:#545B70;">You've received a new enquiry through the SitePragati website.</p>
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            ${row('Name', name)}
            ${row('Business', business)}
            ${row('Business type', businessType)}
            ${row('Contact', contact)}
            ${row('Message', message)}
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#F5F6F8; padding:16px 28px; text-align:center;">
          <span style="font-size:12px; color:#545B70;">Sent automatically from your SitePragati admin backend.</span>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
