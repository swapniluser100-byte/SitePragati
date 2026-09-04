-- Run this against your EXISTING database to add only the two new
-- case studies, without re-inserting Prakash's Kitchen (which is
-- already there from your first run).

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
  3
);
