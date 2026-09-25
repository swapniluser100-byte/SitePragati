-- Run this once against the existing database to support "Forgot
-- password?" on the admin login screen. Creates a new table only —
-- doesn't touch any existing data, and the admin login keeps working
-- with your current ADMIN_PASSWORD secret until you actually use
-- "Forgot password?" for the first time.

CREATE TABLE IF NOT EXISTS admin_auth (
  id INTEGER PRIMARY KEY,
  password_hash TEXT,
  reset_token TEXT,
  reset_token_expires TEXT
);
