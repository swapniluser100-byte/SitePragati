-- Plaintext mirror of each customer's current portal password, kept in
-- sync on every password change. Powers the one-click login link
-- (?role=customer&page=ticket&email=&pw=) shown on the customer detail
-- page — the link is useless if the password can't be read back to
-- build it, so this is a deliberate, scoped exception to storing only
-- password hashes.
ALTER TABLE customers ADD COLUMN quick_login_password TEXT;