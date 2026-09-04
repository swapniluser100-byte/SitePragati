-- Run this against your existing database to add the customers and
-- transactions tables. Safe to run even with existing case_studies/leads
-- data — CREATE TABLE IF NOT EXISTS won't touch anything that's already there.

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  address TEXT,
  next_payment_due_date TEXT,
  next_payment_due_amount REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  transaction_date TEXT,
  description TEXT,
  status TEXT DEFAULT 'Paid',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
