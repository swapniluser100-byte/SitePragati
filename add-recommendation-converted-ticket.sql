-- Tracks which ticket a recommendation was converted into, so the
-- customer portal can show "already converted" instead of letting the
-- customer submit the same recommendation as a ticket twice.
ALTER TABLE recommendations ADD COLUMN converted_ticket_id INTEGER;
