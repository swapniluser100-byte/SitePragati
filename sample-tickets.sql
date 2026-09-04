-- Sample tickets for testing the customer portal + admin Tickets tab.
-- Attaches all 5 tickets to your FIRST customer automatically (no need
-- to know their exact ID). Run this in the D1 Console.
--
-- If you have multiple customers and want to target a SPECIFIC one
-- instead, replace (SELECT id FROM customers LIMIT 1) with
-- (SELECT id FROM customers WHERE business_name = 'Exact Business Name')

INSERT INTO tickets (customer_id, subject, description, status) VALUES
  ((SELECT id FROM customers LIMIT 1),
   'Update menu prices',
   'Please update the filter coffee price to ₹50 and add the new seasonal special.',
   'Open'),

  ((SELECT id FROM customers LIMIT 1),
   'Broken image on gallery section',
   'The third photo in the gallery isn''t loading on mobile — shows a broken image icon.',
   'In Progress'),

  ((SELECT id FROM customers LIMIT 1),
   'Add new payment QR code',
   'We switched our UPI ID, need the QR code on the site updated to the new one.',
   'Resolved'),

  ((SELECT id FROM customers LIMIT 1),
   'Update business hours for festival season',
   'We''re staying open till 11pm during the festival week — please update the hours section.',
   'Closed'),

  ((SELECT id FROM customers LIMIT 1),
   'Add WhatsApp contact button',
   'Can we get a WhatsApp click-to-chat button next to the phone number in the footer?',
   'Open');
