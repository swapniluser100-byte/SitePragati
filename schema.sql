-- SitePragati D1 schema: case_studies table
-- Run this once to create the table, then again (or separately) to seed it.

CREATE TABLE IF NOT EXISTS case_studies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL,
  category TEXT,
  site_url TEXT,
  description TEXT,
  image_file TEXT DEFAULT 'case-placeholder.svg',
  stat1_label TEXT,
  stat1_value TEXT,
  stat2_label TEXT,
  stat2_value TEXT,
  stat3_label TEXT,
  stat3_value TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed: your existing Prakash's Kitchen case study, migrated from the
-- hardcoded HTML version so the site looks identical after the switch.
INSERT INTO case_studies (
  business_name, category, site_url, description, image_file,
  stat1_label, stat1_value, stat2_label, stat2_value, stat3_label, stat3_value,
  sort_order
) VALUES (
  "Prakash's Kitchen",
  'Café & restaurant',
  'prakashskitchen.pages.dev',
  'A home-style café needed a way to take orders and payments online without paying monthly software fees. We built a full ordering flow with live cart totals, UPI payment, and delivery address capture — plus automatic order logging so nothing gets missed.',
  'case_study.svg',
  'from brief to live site', '3 days',
  'hosting & backend cost', '₹0/mo',
  'fee on online orders (UPI: 0%)', '2%',
  1
);

INSERT INTO case_studies (
  business_name, category, site_url, description, image_file,
  stat1_label, stat1_value, stat2_label, stat2_value, stat3_label, stat3_value,
  sort_order
) VALUES (
  "Bappa Phool Bazaar",
  'Seasonal e-commerce · flowers & festival decor',
  'https://ganpatiphoolghar.ganpatiphoolghar.workers.dev/',
  'A seasonal Ganesh Chaturthi flower and handmade-decor business needed to sell online with zero recurring software cost. We built a searchable product catalog with cart and cash-on-delivery checkout, a password-protected admin console for adding and editing products (including photo uploads straight to Google Drive), and automatic order and customer logging to Google Sheets — no database and no monthly fees.',
  'case_study.svg',
  'hosting & backend cost', '₹0/mo',
  'fee on cash-on-delivery orders', '0%',
  'time to add a new product', '<1 min',
  2
);

INSERT INTO case_studies (
  business_name, category, site_url, description, image_file,
  stat1_label, stat1_value, stat2_label, stat2_value, stat3_label, stat3_value,
  sort_order
) VALUES (
  "Prakruti Nursery",
  'Local e-commerce · plants & nursery',
  'https://prakruti-nursery.swapniluser100.workers.dev/',
  'A Pune-based plant nursery needed to sell online with zero recurring software cost. We built a searchable product catalog with cart and WhatsApp-based checkout, a password-protected admin console for adding and editing products (including photo uploads straight to Google Drive), and a live product catalog synced from Google Drive — no database and no monthly fees.',
  'case_study.svg',
  'hosting & backend cost', '₹0/mo',
  'fee on WhatsApp orders', '0%',
  'time to add a new product', '<1 min',
  1
);



-- To add another case study later, copy this INSERT pattern with new values.
-- Example (commented out):
-- INSERT INTO case_studies (
--   business_name, category, site_url, description, image_file,
--   stat1_label, stat1_value, stat2_label, stat2_value, stat3_label, stat3_value,
--   sort_order
-- ) VALUES (
--   'Your Next Client', 'Retail / Shop', 'clientsite.pages.dev',
--   'Description of the project...', 'case-placeholder.svg',
--   'build time', '5 days', 'monthly cost', '₹0', 'orders processed', '120+',
--   2
-- );
