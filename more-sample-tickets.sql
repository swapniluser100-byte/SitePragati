-- More sample tickets — different scenarios (technical, content,
-- feature requests) for further testing. Attaches to your first
-- customer automatically. Run in the D1 Console.

INSERT INTO tickets (customer_id, subject, description, status) VALUES
  ((SELECT id FROM customers LIMIT 1),
   'Site loading slowly on mobile',
   'Customers have mentioned the homepage takes a few seconds to load on their phones. Can you check what''s causing it?',
   'Open'),

  ((SELECT id FROM customers LIMIT 1),
   'Add 3 new photos to gallery',
   'Attaching photos of our renovated seating area — please add them to replace the placeholder tiles.',
   'Open'),

  ((SELECT id FROM customers LIMIT 1),
   'Typo in About section',
   '"Sicne 2012" should be "Since 2012" in the About us paragraph.',
   'Resolved'),

  ((SELECT id FROM customers LIMIT 1),
   'Enable minimum order amount',
   'Can we set a ₹150 minimum for online orders? A few customers have been placing very small orders.',
   'In Progress'),

  ((SELECT id FROM customers LIMIT 1),
   'Contact form not sending confirmation',
   'Customers say they don''t get any confirmation after submitting the contact form — can you check?',
   'Open'),

  ((SELECT id FROM customers LIMIT 1),
   'Add Diwali special banner',
   'Want a temporary banner on the homepage announcing our Diwali menu, similar to what we discussed on the call.',
   'Open'),

  ((SELECT id FROM customers LIMIT 1),
   'Remove discontinued menu item',
   'Please remove "Masala Chai Latte" — we''re not offering it anymore.',
   'Closed'),

  ((SELECT id FROM customers LIMIT 1),
   'Instagram link not working',
   'The Instagram icon in the footer links to a 404 page instead of our profile.',
   'In Progress');
