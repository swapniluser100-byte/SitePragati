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
5. **Important — the "from" address restriction:** by default, emails send from `onboarding@resend.dev`, Resend's shared test address. **This can only deliver to your own Resend account email** — it cannot send to customers or anyone else. This is fine for the enquiry/new-ticket emails (they go to you), but it will silently block the ticket status-update emails, which need to reach your customers' own email addresses.

   To fix this, verify your own domain:
   - Buy a domain if you don't have one (~₹500–900/year for `.in`, from Hostinger or BigRock)
   - Go to Resend → **Domains** → **Add Domain**, enter it
   - Add the DNS records Resend shows you (in your registrar's DNS settings, or Cloudflare if you've pointed DNS there)
   - Once verified, open `wrangler.toml` and uncomment/set:
     ```
     FROM_EMAIL = "SitePragati <hello@yourdomain.in>"
     ```
   - Redeploy — no code changes needed, `functions/_utils/email.js` already reads this automatically

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

### Adding the customers + transactions tables (if you already ran the original schema.sql)

Since `customers` and `transactions` were added after your first setup, run this once against your existing database so you don't risk re-running the whole `schema.sql` (which would duplicate your case studies):

```
npx wrangler d1 execute sitepragati-db --remote --file=create-customers-tables.sql
```

This only creates the two new tables — it doesn't touch `case_studies` or `leads`. After this, the **Customers** tab in `/admin.html` will work.

**Or via CLI:** save a new `INSERT` statement as a `.sql` file and run:

```
npx wrangler d1 execute sitepragati-db --remote --file=your-new-file.sql
```

## 5. Set up the admin console

Visit `/admin.html` on your site to log in and manage leads and case studies — no more manually running SQL in the D1 Console for everyday updates.

1. **Set two more secrets** (same command pattern as Resend):

   ```
   npx wrangler pages secret put ADMIN_PASSWORD
   npx wrangler pages secret put SESSION_SECRET
   ```

   - `ADMIN_PASSWORD` — pick a real password, this is what you'll type in at the login screen
   - `SESSION_SECRET` — any long random string (e.g. mash your keyboard for 40+ characters) — you'll never need to type this in yourself, it's just used internally to sign login sessions securely

2. Redeploy: `npx wrangler pages deploy .`

3. Go to `https://yoursite.pages.dev/admin.html`, log in with your `ADMIN_PASSWORD`

**What you can do there:**

- **Leads tab** — see every enquiry, change its status (New / Contacted / Won / Lost) with a dropdown, delete old ones
- **Customers tab** — track your actual paying clients: business name, contact name, phone, address, and next payment due date/amount. Click "Transactions" on any customer to view, add, edit, or delete their full payment history
- **Case Studies tab** — add, edit, or delete case studies through a form — no SQL needed anymore. Changes appear on the live "Our work" section immediately (just refresh)

**Security notes:**

- `/admin.html` isn't linked from anywhere on the public site, but it's not secret either — anyone who guesses the URL sees the login screen (they can't get in without the password, but change your password if you ever suspect it leaked)
- Sessions last 24 hours, then you'll need to log in again
- This is a single-shared-password system, fine for one or two people managing the site — if you ever need multiple admin accounts with separate logins, that's a bigger upgrade (real user accounts) worth asking for separately

## 6. Set up the customer portal

Lets your paying customers log in at `/customer-portal.html` to view and raise maintenance tickets — separate from your admin login, and each customer only ever sees their own tickets.

1. If you already have a live database, run this once to add the new columns/table:

   ```
   npx wrangler d1 execute sitepragati-db --remote --file=create-customer-portal-tables.sql
   ```

   (A fresh install already gets this from `schema.sql` — no separate step needed.)

2. No new secrets needed — it reuses your existing `SESSION_SECRET`.

3. **Give each customer a login:** go to `/admin.html` → **Customers** tab → **Edit** an existing customer (or **+ Add customer** for a new one) → fill in **Email** and **Password**. This becomes their login for `/customer-portal.html`. Share these credentials with them yourself (WhatsApp, email, however you normally communicate) — there's no public sign-up.

4. **Customer unique IDs:** every new customer automatically gets a random 15-character reference ID, shown on their card in the Customers tab. If you already have a live database, run this once to add support for it:

   ```
   npx wrangler d1 execute sitepragati-db --remote --file=add-customer-unique-id.sql
   ```

   Existing customers won't have one until you next edit and save them (it fills in automatically at that point — no need to type anything).

5. Redeploy: `npx wrangler pages deploy .`

**What your customer sees:** a simple login, then a list of their own tickets with status badges (Open / In Progress / Resolved / Closed), and a "+ New ticket" button to raise a new one.

**What you see:** a new **Tickets** tab in `/admin.html` showing tickets from _all_ customers at once (with their business name), where you update status via a dropdown — same pattern as the Leads tab.

**Changing a customer's password later:** edit them in the Customers tab and type a new password — leave the password field blank to keep their current one unchanged.

## 7. Custom domain (optional)

Buy `sitepragati.in` or similar from Hostinger/BigRock (~₹500–900/year), then connect it under **Custom Domains** in your Cloudflare Pages project (dashboard, not CLI).

## 8. Updating the site later

For any change to `index.html`, `style.css`, `script.js`, or `functions/`, redeploy with:

```
npx wrangler pages deploy .
```

from the project folder. This replaces the old "drag files into the dashboard" method — it's needed now so the D1 binding and Functions stay correctly wired up. Case study content updates don't need this — those go through the D1 Console (Step 4) instead.

If you connect a GitHub repo for automatic deploys, keep `apps-script-code.gs` **out of that repo** (or keep the repo private) since it documents which Script Properties your backend expects. `wrangler.toml` is safe to commit — it only contains your database's ID, not credentials.
