-- Run this against your EXISTING database to add a short, human-readable
-- reference code to tickets (e.g. "K7XPQ2") — used on the public
-- "Raise a Request" page's tracking tab so a customer can look up their
-- request's status without guessing a sequential ticket number.
--
-- NOTE: SQLite doesn't allow adding a UNIQUE column directly via
-- ALTER TABLE, so this adds a plain column first, then creates a
-- separate unique index — which enforces the exact same guarantee.
--
-- Your existing tickets will show a blank reference_code (SQLite allows
-- multiple NULLs under a unique index, so this doesn't cause any
-- conflict) until they're next edited in the admin console (Tickets tab
-- → open a ticket → Edit → Save) — one gets generated and filled in
-- automatically at that point, same as the customer unique_id backfill.

ALTER TABLE tickets ADD COLUMN reference_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_reference_code ON tickets(reference_code);
