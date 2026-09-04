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
    const name = (formData.get("name") || "").toString().trim();
    const business = (formData.get("business") || "").toString().trim();
    const businessType = (formData.get("businessType") || "").toString().trim();
    const contact = (formData.get("contact") || "").toString().trim();
    const message = (formData.get("message") || "").toString().trim();

    if (!name || !contact) {
      return json({ error: "Name and contact are required" }, 400);
    }

    // 1. Store in D1
    await env.DB.prepare(
      `INSERT INTO leads (name, business, business_type, contact, message)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(name, business, businessType, contact, message)
      .run();

    // 2. Email notification via Resend
    const notifyEmail = env.NOTIFY_EMAIL;
    const resendKey = env.RESEND_API_KEY;

    if (resendKey && notifyEmail) {
      const subject = `New enquiry from ${name}${business ? " (" + business + ")" : ""}`;
      const bodyText =
        `A new enquiry came in through the SitePragati website:\n\n` +
        `Name: ${name}\n` +
        `Business: ${business}\n` +
        `Business type: ${businessType}\n` +
        `Contact: ${contact}\n` +
        `Message: ${message}`;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SitePragati <onboarding@resend.dev>", // see DEPLOY-GUIDE.md to use your own domain
          to: [notifyEmail],
          subject: subject,
          text: bodyText,
        }),
      });

      if (!emailRes.ok) {
        // Lead is already saved in D1 even if the email fails — log but don't fail the request
        const errText = await emailRes.text();
        console.error("Resend error:", errText);
      }
    }

    return json({ result: "success" });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
