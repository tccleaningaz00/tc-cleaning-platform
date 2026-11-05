CREATE TABLE IF NOT EXISTS client_roster_import_batches (
  id TEXT PRIMARY KEY,
  source_file TEXT NOT NULL,
  report_month TEXT NOT NULL,
  client_count INTEGER NOT NULL,
  zelle_linked_count INTEGER NOT NULL,
  venmo_linked_count INTEGER NOT NULL,
  both_linked_count INTEGER NOT NULL,
  report_metadata_json TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_file, report_month)
);

CREATE TABLE IF NOT EXISTS client_profiles (
  customer_id TEXT PRIMARY KEY,
  import_batch_id TEXT NOT NULL,
  roster_name TEXT NOT NULL,
  alias_names TEXT,
  frequency_category TEXT,
  property_source_text TEXT NOT NULL,
  service_notes TEXT NOT NULL,
  november_schedule_reference TEXT NOT NULL,
  payment_cross_reference TEXT NOT NULL,
  review_flags TEXT,
  source_report_month TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (import_batch_id) REFERENCES client_roster_import_batches(id),
  UNIQUE (import_batch_id, roster_name)
);

CREATE INDEX IF NOT EXISTS idx_client_profiles_roster_name
  ON client_profiles (roster_name COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_client_profiles_import_batch
  ON client_profiles (import_batch_id);
