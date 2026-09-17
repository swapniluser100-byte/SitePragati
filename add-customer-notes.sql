-- Run this against your EXISTING database to add a free-text notes
-- field on each customer (admin-only — never shown to the customer in
-- their own portal). Safe to run once — adds one new column only,
-- doesn't touch any existing customer data (existing rows just get
-- NULL, same as any other optional field).

ALTER TABLE customers ADD COLUMN notes TEXT;
