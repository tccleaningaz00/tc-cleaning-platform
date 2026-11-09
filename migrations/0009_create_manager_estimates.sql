CREATE TABLE IF NOT EXISTS manager_estimates (
  id TEXT PRIMARY KEY,
  estimate_number TEXT NOT NULL UNIQUE,
  source_quote_id TEXT UNIQUE,
  customer_id TEXT,
  property_id TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  property_address TEXT NOT NULL DEFAULT '',
  service_type TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  total_cents INTEGER NOT NULL,
  deposit_percent REAL NOT NULL,
  deposit_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'approved', 'declined', 'deposit_paid')),
  approval_token TEXT UNIQUE,
  chase_payment_url TEXT NOT NULL DEFAULT '',
  venmo_url TEXT NOT NULL DEFAULT '',
  zelle_recipient TEXT NOT NULL DEFAULT '',
  valid_until TEXT NOT NULL,
  sent_at TEXT,
  approved_at TEXT,
  deposit_paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS manager_estimates_created_idx ON manager_estimates(created_at DESC);
CREATE INDEX IF NOT EXISTS manager_estimates_status_idx ON manager_estimates(status);
CREATE TABLE IF NOT EXISTS manager_estimate_items (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL,
  FOREIGN KEY (estimate_id) REFERENCES manager_estimates(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS manager_estimate_items_estimate_idx ON manager_estimate_items(estimate_id);
