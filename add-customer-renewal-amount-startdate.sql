-- Run this once against the existing database. Adds two columns the
-- renewal auto-creation logic now depends on: the amount to charge each
-- cycle, and the anchor date for a customer's very first cycle (used
-- when they have no renewal history yet). Safe to run once — both are
-- nullable and no existing data is touched.

ALTER TABLE customers ADD COLUMN renewal_amount REAL;
ALTER TABLE customers ADD COLUMN renewal_start_date TEXT;
