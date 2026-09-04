-- Run this against your existing database to add the missing leads table.
-- Safe to run even if case_studies already has data — this only affects
-- the leads table, and CREATE TABLE IF NOT EXISTS won't touch anything
-- that already exists.

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  business TEXT,
  business_type TEXT,
  contact TEXT,
  message TEXT,
  status TEXT DEFAULT 'New',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
