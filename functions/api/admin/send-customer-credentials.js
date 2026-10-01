// POST /api/admin/send-customer-credentials — { customerId } → generates a
// brand-new random password for that customer, saves it (hashed, same as
// any other password change), and emails them the customer-portal URL,
// their login email, and the new password.
//
// Passwords are stored as one-way hashes, so there's no way to recover
// and re-send a customer's existing password — this always issues a
// fresh one, the same way "Forgot password?" does for the admin login.

import { json, hashPassword, generateRandomId } from "../../_utils/auth.js";
import { brandedEmailHtml, sendResendEmail } from "../../_utils/email.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { customerId } = await request.json();
    if (!customerId) return json({ error: "customerId is required" }, 400);

    const customer = await env.DB.prepare(
      "SELECT id, business_name, email FROM customers WHERE id = ?",
    )
      .bind(customerId)
      .first();
    if (!customer) return json({ error: "Customer not found" }, 404);
    if (!customer.email)
      return json(
        { error: "This customer has no login email set — add one first" },
        400,
      );

    const newPassword = generateRandomId(12);
    const passwordHash = await hashPassword(newPassword);
    // quick_login_password mirrors it in plaintext, for the one-click
    // login link on the customer detail page — see schema.sql.
    await env.DB.prepare(
      "UPDATE customers SET password_hash = ?, quick_login_password = ? WHERE id = ?",
    )
      .bind(passwordHash, newPassword, customerId)
      .run();

    const portalUrl = `${new URL(request.url).origin}/portal.html`;
    const html = brandedEmailHtml({
      badgeText: "Portal login",
      introText: `Here are your login details for the SitePragati customer portal, ${customer.business_name}. For security, this replaces any previous password.`,
      rows: [
        ["Portal URL", portalUrl],
        ["Login email", customer.email],
        ["Password", newPassword],
      ],
      ctaText: "Open customer portal",
      ctaUrl: portalUrl,
      footerText: "You can change this password any time by contacting us.",
    });

    const sendResult = await sendResendEmail(env, {
      to: customer.email,
      subject: "Your SitePragati customer portal login",
      text: `Portal URL: ${portalUrl}\nLogin email: ${customer.email}\nPassword: ${newPassword}\n\nFor security, this replaces any previous password.`,
      html,
    });

    if (!sendResult.ok)
      return json(
        {
          error:
            "Password was reset, but the email could not be sent. Check RESEND_API_KEY/FROM_EMAIL are configured.",
        },
        500,
      );

    return json({ result: "success" });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
