-- Run this against your EXISTING database to add the Renewals tab's
-- table. Safe to run once — creates a new table only, doesn't touch any
-- existing data.

CREATE TABLE IF NOT EXISTS renewals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  frequency TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  renewed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
