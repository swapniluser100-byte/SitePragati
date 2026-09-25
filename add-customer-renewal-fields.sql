-- Run this against your EXISTING database to add "Renewal required?"
-- and "Frequency" to each customer. Safe to run once — adds two new
-- columns only, doesn't touch any existing customer data (existing
-- rows get renewal_required = 0 and a blank frequency, same as any
-- other optional field).

ALTER TABLE customers ADD COLUMN renewal_required INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN renewal_frequency TEXT;
