ALTER TABLE invoices ADD COLUMN deposit_paid_cents INTEGER NOT NULL DEFAULT 0
  CHECK (deposit_paid_cents >= 0);
