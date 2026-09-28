-- Run this once against the existing database. Adds a flag to mark a
-- customer as a real, actual customer (as opposed to a demo/test
-- entry) — the Customers tab filters to this being true by default.
-- SQLite backfills the DEFAULT value for existing rows too, so every
-- current customer becomes is_actual_customer = 1 automatically; no
-- existing customer disappears from the default view after this runs.

ALTER TABLE customers ADD COLUMN is_actual_customer INTEGER DEFAULT 1;
