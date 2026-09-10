-- Run this against your EXISTING database to add ticket payment support.
-- Safe to run once — adds two new columns only, doesn't touch any
-- existing ticket data.

ALTER TABLE tickets ADD COLUMN payment_amount REAL;
ALTER TABLE tickets ADD COLUMN payment_reference TEXT;
