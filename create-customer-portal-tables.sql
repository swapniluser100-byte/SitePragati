-- Run this against your EXISTING database to add customer-portal login
-- and ticket support. Safe to run once — adds new columns/tables only,
-- doesn't touch your existing customers, transactions, leads, or case
-- studies data.
--
-- NOTE: run each ALTER TABLE line separately if your D1 Console errors
-- on running multiple ALTERs in one go — some SQLite tools want them
-- one at a time. The CREATE TABLE at the bottom is safe to run alongside
-- them either way.

ALTER TABLE customers ADD COLUMN email TEXT;
ALTER TABLE customers ADD COLUMN password_hash TEXT;

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- After running this, go to the admin console → Customers tab → edit
-- each existing customer to set their email and a password, so they
-- can log into the customer portal. New customers you add from now on
-- will be asked for these directly in the Add Customer form.
