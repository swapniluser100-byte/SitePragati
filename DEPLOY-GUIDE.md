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

## 2. Set up lead capture (email + Google Sheet — your management dashboard)

This is how you'll "manage everything" — every enquiry lands in a spreadsheet and your inbox automatically.

1. Go to **sheets.google.com** → create a spreadsheet (e.g. "SitePragati — Leads")
2. Go to **Extensions → Apps Script**
3. Delete the default code and paste in `apps-script-code.gs`
4. Replace `youremail@gmail.com` with your real email
5. **Deploy → New deployment → gear icon → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, authorize when prompted
6. Copy the URL ending in `/exec`
7. In `script.js`, replace:
   ```js
   const FORM_ENDPOINT = "PASTE_YOUR_APPS_SCRIPT_URL_HERE";
   ```
   with your copied URL

A "Leads" tab is created automatically on first submission, with columns: Timestamp, Name, Business Name, Business Type, Contact, Message.

## 3. Set up the Razorpay test-mode payment demo

Uses the same Apps Script project from Step 2.

1. In the Apps Script editor, click the **gear icon** (Project Settings)
2. Scroll to **Script Properties** → **Add script property**, and add:
   | Property | Value |
   |---|---|
   | `RAZORPAY_KEY_ID` | `rzp_test_TX44MtX2QINHHq` |
   | `RAZORPAY_KEY_SECRET` | `jsBLVe1E8wNjGKS5T1RLVVi7` |
3. **Deploy → Manage deployments → edit (pencil icon) → New version → Deploy**

**Testing it:** test card `4111 1111 1111 1111` (any future date/CVV), or test UPI `success@razorpay`. No real money moves. Successful payments log to a "Payments" tab and email you a verified confirmation.

## 4. Set up Cloudflare D1 (the "Our work" database)

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

4. **Create the table and load your first case study:**

   ```
   npx wrangler d1 execute sitepragati-db --remote --file=schema.sql
   ```

   This runs `schema.sql`, which creates the `case_studies` table and inserts the Prakash's Kitchen case study — so the site looks identical to before once it's live.

5. **Deploy everything together** (static files + the Function + the D1 binding):

   ```
   npx wrangler pages deploy .
   ```

   First time, it'll ask you to name the project (e.g. `sitepragati`) — this creates your Pages project and gives you a `.pages.dev` URL, same as the dashboard upload used to.

6. Open the live URL and check "Our work" — it should show Prakash's Kitchen, now loaded live from the database instead of hardcoded HTML.

### Adding a new case study later (no code changes needed)

**Easiest — via the Cloudflare dashboard:** go to **Workers & Pages → D1 → sitepragati-db → Console** tab, and paste an `INSERT` statement directly (see the commented example at the bottom of `schema.sql` for the exact format), then run it. Refresh your site — the new case study appears automatically.

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
