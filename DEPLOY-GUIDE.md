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

## 3. Deploy to Cloudflare Pages (free)
1. Create a free account at **dash.cloudflare.com**
2. **Workers & Pages → Create → Pages → Upload assets**
3. Drag in all files (`index.html`, `style.css`, `script.js`, `images/` folder) together
4. Click **Deploy site** — you get a free `.pages.dev` URL immediately

## 4. Custom domain (optional)
Buy `sitepragati.in` or similar from Hostinger/BigRock (~₹500–900/year), then connect it under **Custom Domains** in your Cloudflare Pages project.

## 5. Updating later
Edit the files, then re-upload to Cloudflare Pages — or connect a GitHub repo for automatic deploys on every push (see your earlier café project notes for the full Git setup steps, which apply the same way here).
