-- Run this against your EXISTING database so each renewal can carry a
-- matching transaction (created Pending alongside the renewal, flipped
-- to Paid when the renewal is marked Renewed). Safe to run once — adds
-- one new column only, doesn't touch any existing transaction data.

ALTER TABLE transactions ADD COLUMN renewal_id INTEGER;
