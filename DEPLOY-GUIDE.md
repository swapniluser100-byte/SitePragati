# Deploying your SitePragati website (free)

Your site is three files — `index.html`, `style.css`, `script.js` — plus an `images` folder. **Keep them all together** in the same folder; the HTML links to the others by filename.

## 1. Fill in your real details
Open `index.html` and replace:
- Email and phone number in the Contact section
- The testimonial quotes once you have real client feedback (they're clearly marked as placeholders)
- Add more case studies to the "Our work" section as you complete projects — copy the `.case-study` block and adjust

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
   const FORM_ENDPOINT = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';
   ```
   with your copied URL

A "Leads" tab is created automatically on first submission, with columns: Timestamp, Name, Business Name, Business Type, Contact, Message. This sheet is your lead list — sort, filter, add a "Status" column yourself (New / Contacted / Won / Lost) to track your pipeline as you like.

## 3. Set up the Razorpay test-mode payment demo
This powers the "See verified payments in action" section — a live demo of what your Premium package delivers. It uses the same Apps Script project from Step 2, so complete that first.

1. In the Apps Script editor (same project as Step 2), click the **gear icon** (Project Settings) in the left sidebar
2. Scroll to **Script Properties** → click **Add script property**, and add these two:
   | Property | Value |
   |---|---|
   | `RAZORPAY_KEY_ID` | `rzp_test_TX44MtX2QINHHq` |
   | `RAZORPAY_KEY_SECRET` | `jsBLVe1E8wNjGKS5T1RLVVi7` |
3. Save, then go back to the **Editor** tab and **Deploy → Manage deployments → edit (pencil icon) → New version → Deploy** (this re-deploys with the new order/verify handlers you already pasted in Step 2 — the `/exec` URL stays the same)
4. That's it — `script.js` already points at the same `FORM_ENDPOINT` you set up in Step 2, so no further changes needed there

**Why the keys live in Script Properties and not in the code:** this keeps the secret key out of any file you might push to GitHub. Never paste the `RAZORPAY_KEY_SECRET` into `script.js`, `index.html`, or commit it anywhere — only `RAZORPAY_KEY_ID` is safe to expose publicly (it's returned automatically to the frontend by the `create_order` response, so you don't need to add it anywhere else).

**Testing it:** open your site, scroll to the demo section, enter an amount, and pay using:
- **Test card:** `4111 1111 1111 1111`, any future expiry date, any 3-digit CVV
- **Test UPI ID:** `success@razorpay`

No real money moves. A successful payment logs a new row to a "Payments" tab (auto-created) and emails you a confirmation — this is genuinely *verified*, not self-reported, since the signature check happens server-side in Apps Script using the secret key.

**These are test keys** (`rzp_test_...`). To accept real payments later, complete Razorpay's KYC to get live keys (`rzp_live_...`), then update the two Script Properties with the live values — no code changes needed.

## 4. Deploy to Cloudflare Pages (free)
1. Create a free account at **dash.cloudflare.com**
2. **Workers & Pages → Create → Pages → Upload assets**
3. Drag in all files (`index.html`, `style.css`, `script.js`, `images/` folder) together — **do not include `apps-script-code.gs`** in this upload; it only belongs in the Apps Script editor, never on the public site or in a public GitHub repo
4. Click **Deploy site** — you get a free `.pages.dev` URL immediately

## 5. Custom domain (optional)
Buy `sitepragati.in` or similar from Hostinger/BigRock (~₹500–900/year), then connect it under **Custom Domains** in your Cloudflare Pages project.

## 6. Updating later
Edit the files, then re-upload to Cloudflare Pages — or connect a GitHub repo for automatic deploys on every push (see your earlier café project notes for the full Git setup steps, which apply the same way here). If you do use GitHub, keep `apps-script-code.gs` **out of that repo** (or keep the repo private) since it documents which Script Properties your backend expects.
