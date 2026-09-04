# Deploying your SitePragati website (free)

Your site now has two parts:

- **Static files** — `index.html`, `style.css`, `script.js`, `images/` (same as before)
- **A serverless backend** — `functions/api/case-studies.js`, which reads from a Cloudflare D1 database (`schema.sql`, `wrangler.toml`)

Because of the D1 database, deployment now goes through the **Wrangler CLI** instead of plain drag-and-drop — Cloudflare's dashboard upload doesn't wire up database bindings on its own.

## 1. Fill in your real details

Open `index.html` and replace:

- Email and phone number in the Contact section
- The testimonial quotes once you have real client feedback (they're clearly marked as placeholders)

The "Our work" section no longer needs manual editing — it's now loaded live from the database (see Step 4).

## 2. Set up lead capture (D1 database + email via Resend)

Every enquiry is now stored in your D1 database and emailed to you via [Resend](https://resend.com) — no Google Sheets involved for leads anymore. (The Razorpay demo in Step 3 still uses your existing Apps Script — that part is unchanged.)

1. Sign up free at **resend.com** (free tier: 3,000 emails/month — plenty for lead notifications)
2. Go to **API Keys** in the Resend dashboard → **Create API Key** → copy it (shown once)
3. Set it as a **secret** (not a plain variable) on your Pages project:
   ```
   npx wrangler pages secret put RESEND_API_KEY
   ```
   Paste the key when prompted. (Or via dashboard: **Settings → Environment variables → Add variable**, type = **Secret**.)
4. In `wrangler.toml`, replace the `NOTIFY_EMAIL` value with your real email:
   ```
   NOTIFY_EMAIL = "youremail@gmail.com"
   ```
5. **About the "from" address:** the Function sends from `onboarding@resend.dev` by default, which works immediately with no setup — good enough to get started. To send from your own domain (e.g. `hello@sitepragati.in`) instead, verify that domain under **Domains** in the Resend dashboard, then update the `from` line in `functions/api/enquiry.js` accordingly.

That's it — no separate deploy step needed here beyond the general deploy in Step 4/5, since this Function ships together with the rest of the site.

**Where your leads live:** every submission is a new row in D1's `leads` table (Name, Business, Business Type, Contact, Message, Status, Timestamp). View them the same way as case studies — **Storage & Databases → D1 SQL Database → sitepragati-db → Console**:

```sql
SELECT * FROM leads ORDER BY created_at DESC;
```

Add your own `status` updates directly:

```sql
UPDATE leads SET status = 'Contacted' WHERE id = 3;
```

## 3. Set up the Razorpay test-mode payment demo

This is separate from lead capture — it still runs through its own Google Apps Script project (unrelated to the D1/Resend setup in Step 2). If you haven't set this up yet:

1. Create a new Google Sheet → **Extensions → Apps Script**
2. Delete the default code and paste in `apps-script-code.gs`
3. Replace `youremail@gmail.com` with your real email
4. **Deploy → New deployment → gear icon → Web app** (Execute as: Me, Access: Anyone) → Deploy, authorize when prompted
5. Copy the `/exec` URL and confirm it matches the `FORM_ENDPOINT` value already set in `script.js`
6. In the Apps Script editor, click the **gear icon** (Project Settings)
7. Scroll to **Script Properties** → **Add script property**, and add:
   | Property | Value |
   |---|---|
   | `RAZORPAY_KEY_ID` | `rzp_test_TX44MtX2QINHHq` |
   | `RAZORPAY_KEY_SECRET` | `jsBLVe1E8wNjGKS5T1RLVVi7` |
8. **Deploy → Manage deployments → edit (pencil icon) → New version → Deploy**

**Testing it:** test card `4111 1111 1111 1111` (any future date/CVV), or test UPI `success@razorpay`. No real money moves. Successful payments log to a "Payments" tab and email you a verified confirmation.

## 4. Set up Cloudflare D1 (case studies + leads database)

**Prerequisite:** install [Node.js](https://nodejs.org) if you don't have it — this gives you `npx`, which runs Wrangler without a separate install.

1. **Log in to Cloudflare from the CLI:**

   ```
   npx wrangler login
   ```

   This opens a browser tab to authenticate — approve it.

2. **Create the D1 database:**

   ```
   npx wrangler d1 create sitepragati-db
   ```

   This prints a `database_id` — copy it.

3. **Paste that ID into `wrangler.toml`:**

   ```
   database_id = "REPLACE_WITH_YOUR_DATABASE_ID"
   ```

   Replace the placeholder with the real ID you copied.

4. **Create both tables and load your first case study:**

   ```
   npx wrangler d1 execute sitepragati-db --remote --file=schema.sql
   ```

   This runs `schema.sql`, which creates the `case_studies` table (seeded with Prakash's Kitchen) and the empty `leads` table.

5. **Deploy everything together** (static files + the Function + the D1 binding):

   ```
   npx wrangler pages deploy .
   ```

   First time, it'll ask you to name the project (e.g. `sitepragati`) — this creates your Pages project and gives you a `.pages.dev` URL, same as the dashboard upload used to.

6. Open the live URL and check "Our work" — it should show Prakash's Kitchen, now loaded live from the database instead of hardcoded HTML.

### Adding a new case study later (no code changes needed)

**Easiest — via the Cloudflare dashboard:** in the left sidebar, click **Storage & Databases → D1 SQL Database**, select `sitepragati-db`, then the **Console** tab. Paste an `INSERT` statement directly (see the commented example at the bottom of `schema.sql` for the exact format), then run it. Refresh your site — the new case study appears automatically.

**Or via CLI:** save a new `INSERT` statement as a `.sql` file and run:

```
npx wrangler d1 execute sitepragati-db --remote --file=your-new-file.sql
```

## 5. Custom domain (optional)

Buy `sitepragati.in` or similar from Hostinger/BigRock (~₹500–900/year), then connect it under **Custom Domains** in your Cloudflare Pages project (dashboard, not CLI).

## 6. Updating the site later

For any change to `index.html`, `style.css`, `script.js`, or `functions/`, redeploy with:

```
npx wrangler pages deploy .
```

from the project folder. This replaces the old "drag files into the dashboard" method — it's needed now so the D1 binding and Functions stay correctly wired up. Case study content updates don't need this — those go through the D1 Console (Step 4) instead.

If you connect a GitHub repo for automatic deploys, keep `apps-script-code.gs` **out of that repo** (or keep the repo private) since it documents which Script Properties your backend expects. `wrangler.toml` is safe to commit — it only contains your database's ID, not credentials.
