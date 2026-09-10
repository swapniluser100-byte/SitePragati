-- Run this against your EXISTING database to support automatic
-- transaction creation when a ticket's payment is confirmed. Safe to
-- run once — adds one new column only, doesn't touch existing data.

ALTER TABLE transactions ADD COLUMN ticket_id INTEGER;
