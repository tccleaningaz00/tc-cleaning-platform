CREATE TABLE IF NOT EXISTS manager_timecards (
  id TEXT PRIMARY KEY,
  employee_name TEXT NOT NULL CHECK (length(employee_name) BETWEEN 1 AND 160),
  hourly_rate_cents INTEGER NOT NULL CHECK (hourly_rate_cents > 0),
  week_start_date TEXT NOT NULL,
  monday_minutes INTEGER NOT NULL CHECK (monday_minutes BETWEEN 0 AND 1440),
  tuesday_minutes INTEGER NOT NULL CHECK (tuesday_minutes BETWEEN 0 AND 1440),
  wednesday_minutes INTEGER NOT NULL CHECK (wednesday_minutes BETWEEN 0 AND 1440),
  thursday_minutes INTEGER NOT NULL CHECK (thursday_minutes BETWEEN 0 AND 1440),
  friday_minutes INTEGER NOT NULL CHECK (friday_minutes BETWEEN 0 AND 1440),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (monday_minutes + tuesday_minutes + wednesday_minutes + thursday_minutes + friday_minutes > 0)
);

CREATE INDEX IF NOT EXISTS manager_timecards_week_idx
  ON manager_timecards(week_start_date DESC, created_at DESC);
