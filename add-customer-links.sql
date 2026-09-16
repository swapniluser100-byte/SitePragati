-- Run this against your EXISTING database to store each customer's live
-- website URL and their site's admin console URL, so the admin console
-- gives you quick links to both. Safe to run once — adds two new
-- columns only, doesn't touch any existing customer data (existing rows
-- just get NULL for both, same as any other optional field).

ALTER TABLE customers ADD COLUMN website_url TEXT;
ALTER TABLE customers ADD COLUMN admin_console_url TEXT;
