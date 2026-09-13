-- Adds the handmade jewelry case study (Kalakriti Jewels).
-- Placeholder description/stats — update via /portal.html (Owner/Admin ->
-- Case Studies tab) once real details are confirmed.

INSERT INTO case_studies (
  business_name, category, site_url, description, image_file,
  stat1_label, stat1_value, stat2_label, stat2_value, stat3_label, stat3_value,
  sort_order
) VALUES (
  "Kalakriti Jewels",
  'Local e-commerce · handmade jewelry',
  'https://jewelry-shop-2li.pages.dev/',
  'A handmade jewelry business needed to showcase and sell its pieces online without recurring software costs. We built a searchable product catalog with cart and checkout, a password-protected admin console for adding and editing products, and automatic order logging — no database fees and no monthly subscriptions.',
  'case_study.svg',
  'hosting & backend cost', '₹0/mo',
  'fee on online orders', '0%',
  'time to add a new product', '<1 min',
  3
);
