CREATE TABLE IF NOT EXISTS client_management_details (
  customer_id TEXT PRIMARY KEY,
  display_name TEXT,
  frequency_category TEXT,
  service_notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
