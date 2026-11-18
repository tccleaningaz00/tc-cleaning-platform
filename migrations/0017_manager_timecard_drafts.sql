CREATE TABLE IF NOT EXISTS manager_timecard_drafts (
  id TEXT PRIMARY KEY,
  employee_name TEXT NOT NULL CHECK (length(employee_name) BETWEEN 1 AND 160),
  hourly_rate_cents INTEGER NOT NULL CHECK (hourly_rate_cents > 0 AND hourly_rate_cents <= 100000),
  week_start_date TEXT NOT NULL,
  monday_minutes INTEGER NOT NULL DEFAULT 0 CHECK (monday_minutes BETWEEN 0 AND 1440),
  tuesday_minutes INTEGER NOT NULL DEFAULT 0 CHECK (tuesday_minutes BETWEEN 0 AND 1440),
  wednesday_minutes INTEGER NOT NULL DEFAULT 0 CHECK (wednesday_minutes BETWEEN 0 AND 1440),
  thursday_minutes INTEGER NOT NULL DEFAULT 0 CHECK (thursday_minutes BETWEEN 0 AND 1440),
  friday_minutes INTEGER NOT NULL DEFAULT 0 CHECK (friday_minutes BETWEEN 0 AND 1440),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS manager_timecard_drafts_employee_week_idx
  ON manager_timecard_drafts(lower(trim(employee_name)), week_start_date);

CREATE INDEX IF NOT EXISTS manager_timecard_drafts_updated_idx
  ON manager_timecard_drafts(updated_at DESC);
