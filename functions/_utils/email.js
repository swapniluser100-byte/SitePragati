// Shared email helpers: a consistent branded HTML template, and a
// wrapper around the Resend API. Used by enquiry.js, customer/tickets.js,
// and admin/tickets.js so every email looks the same and there's one
// place to update the design.

export function esc(str) {
  return (str || '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// rows: array of [label, value] pairs. Rows with an empty value are skipped.
export function brandedEmailHtml({ badgeText, introText, rows, footerText }) {
  const rowsHtml = rows
    .filter(([, value]) => !!value)
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 0; border-top:1px solid #EBEDF2; font-size:13px; font-weight:600; color:#545B70; width:140px; vertical-align:top;">${esc(label)}</td>
        <td style="padding:10px 0; border-top:1px solid #EBEDF2; font-size:14px; color:#1B2544; vertical-align:top;">${esc(value)}</td>
      </tr>`)
    .join('');

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
          <span style="font-size:13px; color:#E8A33D; margin-left:8px; font-weight:600;">${esc(badgeText)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 18px; font-size:14px; color:#545B70;">${esc(introText)}</p>
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            ${rowsHtml}
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#F5F6F8; padding:16px 28px; text-align:center;">
          <span style="font-size:12px; color:#545B70;">${esc(footerText)}</span>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

// Sends via Resend. Never throws — logs and returns { ok: false } on
// failure so callers can decide whether to continue (e.g. a lead/ticket
// should still save even if the email fails).
export async function sendResendEmail(env, { to, subject, text, html }) {
  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set — skipping email send.');
    return { ok: false };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SitePragati <onboarding@resend.dev>', // see DEPLOY-GUIDE.md to use your own domain
        to: [to],
        subject,
        text,
        html
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend error:', errText);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('Resend request failed:', err.message);
    return { ok: false };
  }
}
