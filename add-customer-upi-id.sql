-- Lets each customer have their own UPI ID for the payment QR code shown
-- on their ticket-payment screen, instead of one UPI ID for everyone.
-- NULL means "use the app default" — no backfill needed.
ALTER TABLE customers ADD COLUMN upi_id TEXT;
