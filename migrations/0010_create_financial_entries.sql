CREATE TABLE IF NOT EXISTS financial_entries (
  id TEXT PRIMARY KEY,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense')),
  transaction_date TEXT NOT NULL,
  paid_date TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  category TEXT NOT NULL,
  counterparty TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS financial_entries_date_idx ON financial_entries(transaction_date DESC);
CREATE INDEX IF NOT EXISTS financial_entries_type_idx ON financial_entries(entry_type, transaction_date DESC);
