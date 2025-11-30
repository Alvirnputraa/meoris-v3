-- Add voucher_code and discount_amount columns to checkout_submissions table

DO $$
BEGIN
  -- Add voucher_code column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checkout_submissions' AND column_name = 'voucher_code'
  ) THEN
    ALTER TABLE checkout_submissions ADD COLUMN voucher_code VARCHAR(50);
  END IF;

  -- Add discount_amount column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checkout_submissions' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE checkout_submissions ADD COLUMN discount_amount DECIMAL(12, 2) DEFAULT 0;
  END IF;
END $$;

COMMENT ON COLUMN checkout_submissions.voucher_code IS 'Voucher code used in this checkout';
COMMENT ON COLUMN checkout_submissions.discount_amount IS 'Discount amount from voucher';
