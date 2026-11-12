ALTER TABLE invoices ADD COLUMN public_view_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_public_view_token_idx
  ON invoices(public_view_token) WHERE public_view_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS document_views (
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'estimate')),
  document_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  first_viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_type, document_id, session_id)
);

CREATE INDEX IF NOT EXISTS document_views_document_idx
  ON document_views(document_type, document_id, first_viewed_at);
