-- =============================================
-- ALTER: orders add payment + linkage columns
-- =============================================

-- Add columns (idempotent)
ALTER TABLE IF EXISTS orders
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS checkout_submission_id UUID REFERENCES checkout_submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_details JSONB,
  ADD COLUMN IF NOT EXISTS payment_expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipping_address_json JSONB;

-- Helpful indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_reference_unique ON orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

