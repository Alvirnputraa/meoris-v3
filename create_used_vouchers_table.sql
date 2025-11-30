-- Tabel untuk tracking voucher yang sudah digunakan
CREATE TABLE IF NOT EXISTS used_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_code VARCHAR(50) NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index untuk performa query
  CONSTRAINT unique_user_voucher UNIQUE(user_id, voucher_code)
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_used_vouchers_user_id ON used_vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_used_vouchers_voucher_code ON used_vouchers(voucher_code);
CREATE INDEX IF NOT EXISTS idx_used_vouchers_order_id ON used_vouchers(order_id);

-- Enable RLS
ALTER TABLE used_vouchers ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa melihat voucher yang mereka gunakan sendiri
CREATE POLICY "select_own_used_vouchers"
  ON used_vouchers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: User bisa insert voucher mereka sendiri
CREATE POLICY "insert_own_used_vouchers"
  ON used_vouchers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Tambahkan kolom voucher_code di tabel orders jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'voucher_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN voucher_code VARCHAR(50);
  END IF;
END $$;

-- Tambahkan kolom discount_amount di tabel orders jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(12, 2) DEFAULT 0;
  END IF;
END $$;

COMMENT ON TABLE used_vouchers IS 'Tracks vouchers that have been used by users';
COMMENT ON COLUMN used_vouchers.user_id IS 'User who used the voucher';
COMMENT ON COLUMN used_vouchers.voucher_code IS 'The voucher code that was used';
COMMENT ON COLUMN used_vouchers.order_id IS 'The order where the voucher was used';
COMMENT ON COLUMN used_vouchers.used_at IS 'When the voucher was marked as used (payment confirmed)';
