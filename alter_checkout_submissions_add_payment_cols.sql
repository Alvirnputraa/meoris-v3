-- =============================================
-- ALTER: checkout_submissions add payment columns
-- =============================================

ALTER TABLE IF EXISTS checkout_submissions
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_details JSONB,
  ADD COLUMN IF NOT EXISTS payment_expired_at TIMESTAMPTZ;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_checkout_submissions_payment_ref ON checkout_submissions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_checkout_submissions_payment_method ON checkout_submissions(payment_method);

