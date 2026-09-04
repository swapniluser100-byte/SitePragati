-- Run this against your EXISTING database to add the customer unique ID
-- feature. Safe to run once — adds a new column only, doesn't touch any
-- existing customer data.
--
-- NOTE: SQLite doesn't allow adding a UNIQUE column directly via
-- ALTER TABLE, so this adds a plain column first, then creates a
-- separate unique index — which enforces the exact same guarantee.
--
-- Your existing customers will show a blank unique_id (SQLite allows
-- multiple NULLs under a unique index, so this doesn't cause any conflict).
-- Only customers created AFTER this migration get one automatically.
--
-- To give an EXISTING customer one too: open them in the admin
-- Customers tab and click Save (no changes needed) — the backend
-- automatically generates and fills in a unique_id for any customer
-- that doesn't already have one, every time they're edited.

ALTER TABLE customers ADD COLUMN unique_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_unique_id ON customers(unique_id);
