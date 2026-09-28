-- Adds a column to store up to 3 configurable maintenance-plan options
-- (price + feature list, as JSON) per customer, shown on their portal
-- when they don't have Renewal required checked.
ALTER TABLE customers ADD COLUMN subscription_plans TEXT;
