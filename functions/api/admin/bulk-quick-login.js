// POST /api/admin/bulk-quick-login — no body needed. Generates a fresh
// random password for every customer that has a login email set,
// saving it (hashed, as normal) and mirroring it in plaintext into
// quick_login_password so the customer detail page can show a working
// one-click login link (?role=customer&page=ticket&email=&pw=) for
// each of them. Does not email anyone — admin shares each link
// manually (e.g. over WhatsApp) at their own pace.
//
// Unconditional: every customer with an email gets a brand-new
// password each time this runs, even ones that already had a working
// quick-login link. This is a deliberate bulk "regenerate everyone's
// link" action, not a one-time backfill — run it again only if you
// actually want to invalidate everyone's current password.

import { json, hashPassword, generateRandomId } from "../../_utils/auth.js";

export async function onRequestPost(context) {
  const { env } = context;
  try {
    const { results: customers } = await env.DB.prepare(
      `SELECT id FROM customers WHERE email IS NOT NULL AND email != ''`,
    ).all();

    let updated = 0;
    for (const customer of customers) {
      const newPassword = generateRandomId(12);
      const passwordHash = await hashPassword(newPassword);
      await env.DB.prepare(
        "UPDATE customers SET password_hash = ?, quick_login_password = ? WHERE id = ?",
      )
        .bind(passwordHash, newPassword, customer.id)
        .run();
      updated++;
    }

    return json({ result: "success", updated });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
