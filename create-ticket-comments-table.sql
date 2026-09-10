-- Run this against your EXISTING database to add ticket comments/file
-- attachments. Safe to run once — creates one new table only, doesn't
-- touch any existing data.

CREATE TABLE IF NOT EXISTS ticket_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  author_type TEXT NOT NULL,
  author_name TEXT,
  comment TEXT,
  file_key TEXT,
  file_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);
