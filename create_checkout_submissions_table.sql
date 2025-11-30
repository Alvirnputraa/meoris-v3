-- =============================================
-- TABLE: checkout_submissions (Final checkout snapshot)
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS checkout_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pra_checkout_id UUID NOT NULL REFERENCES pra_checkout(id) ON DELETE CASCADE,

  -- Alamat Pengiriman
  shipping_address JSONB NOT NULL, -- { nama, telepon, alamat, provinsi, kota, kecamatan, kode_pos, catatan }

  -- Metode Pengiriman (cukup nama kurir)
  shipping_method VARCHAR(50) NOT NULL, -- contoh: 'JNE', 'J&T', 'Sicepat'

  -- Ringkasan Pesanan (tanpa subtotal/shipping_cost/total)
  order_summary JSONB NOT NULL,   -- { discount, voucher_code, ... (tambahan lain bila perlu) }

  -- Nilai terpisah
  subtotal BIGINT NOT NULL,       -- dalam rupiah
  shipping_cost BIGINT NOT NULL,  -- Biaya Jasa Kirim (rupiah)
  total BIGINT NOT NULL,          -- rupiah

  -- Detail Order (snapshot items)
  items JSONB NOT NULL,           -- [ { produk_id, nama_produk, size, quantity, harga_satuan } ]

  status TEXT NOT NULL DEFAULT 'submitted', -- submitted, paid, cancelled, failed

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- safeguard basic non-negative amounts
  CONSTRAINT chk_amounts_nonneg CHECK (subtotal >= 0 AND shipping_cost >= 0 AND total >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkout_submissions_user ON checkout_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_submissions_pra ON checkout_submissions(pra_checkout_id);
CREATE INDEX IF NOT EXISTS idx_checkout_submissions_status ON checkout_submissions(status);
CREATE INDEX IF NOT EXISTS idx_checkout_submissions_created ON checkout_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_checkout_submissions_shipping_method ON checkout_submissions(shipping_method);

-- Update updated_at trigger (reuse helper)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_checkout_submissions_updated_at ON checkout_submissions;
CREATE TRIGGER update_checkout_submissions_updated_at
  BEFORE UPDATE ON checkout_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE checkout_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkout_submissions_select_own" ON checkout_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "checkout_submissions_insert_own" ON checkout_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "checkout_submissions_update_own" ON checkout_submissions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "checkout_submissions_delete_own" ON checkout_submissions
  FOR DELETE USING (auth.uid() = user_id);
