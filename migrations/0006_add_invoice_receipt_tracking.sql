ALTER TABLE invoices ADD COLUMN receipt_status TEXT NOT NULL DEFAULT 'not_sent'
  CHECK (receipt_status IN ('not_sent', 'sending', 'sent', 'failed'));

ALTER TABLE invoices ADD COLUMN receipt_sent_at TEXT;
