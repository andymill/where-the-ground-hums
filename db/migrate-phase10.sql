-- Phase 10: invoices / receipts. A file in R2 (like documents) plus structured
-- financial fields for spend tracking: vendor, amount, date, project. Extracted
-- from the receipt image by a Workers AI vision model at upload, then confirmed.
-- Powers the Invoices screen: month/year grouping, search, project chips, and a
-- period spend dashboard.
CREATE TABLE IF NOT EXISTS invoices (
  id           TEXT PRIMARY KEY,
  r2_key       TEXT NOT NULL,
  thumb        TEXT,
  content_type TEXT,
  size         INTEGER,
  vendor       TEXT,
  description  TEXT,
  amount       REAL,
  invoice_date TEXT,            -- YYYY-MM-DD
  project      TEXT,
  paid_by      TEXT,
  note         TEXT,
  uploaded_by  TEXT,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices (project);
