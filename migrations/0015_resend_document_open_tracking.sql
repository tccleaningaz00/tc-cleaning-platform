CREATE TABLE document_email_messages (
  email_id TEXT PRIMARY KEY,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'estimate')),
  document_id TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  open_count INTEGER NOT NULL DEFAULT 0 CHECK (open_count >= 0),
  first_opened_at TEXT,
  last_opened_at TEXT
);

CREATE INDEX document_email_messages_document_idx
  ON document_email_messages(document_type, document_id, sent_at);

CREATE TABLE document_email_open_events (
  event_id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL,
  opened_at TEXT NOT NULL
);

CREATE INDEX document_email_open_events_email_idx
  ON document_email_open_events(email_id, opened_at);
