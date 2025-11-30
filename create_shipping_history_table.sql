-- =============================================
-- CREATE TABLE: shipping_history
-- =============================================
-- Tabel untuk menyimpan riwayat tracking pengiriman dari Biteship webhook
-- Setiap kali ada update status dari Biteship, webhook akan insert 1 row baru

CREATE TABLE IF NOT EXISTS shipping_history (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key ke orders table
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Event information dari Biteship
  event_type TEXT NOT NULL,  -- 'order.status' atau 'order.waybill_id'

  -- Status tracking
  biteship_status TEXT,  -- Status asli dari Biteship (confirmed, picked, delivered, etc)
  status_display TEXT NOT NULL,  -- Status dalam bahasa Indonesia untuk ditampilkan ke user

  -- Shipping information
  courier_name TEXT,  -- Nama kurir (JNE, SiCepat, JNT, etc)
  courier_tracking_id TEXT,  -- Biteship internal tracking ID
  courier_waybill_id TEXT,  -- Nomor resi dari ekspedisi

  -- Additional information (untuk data tambahan dari webhook)
  note TEXT,  -- Catatan tambahan (misal: lokasi saat ini, nama penerima, dll)
  location TEXT,  -- Lokasi terakhir paket (jika ada)

  -- Metadata
  webhook_payload JSONB,  -- Simpan full payload webhook untuk reference/debugging

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes untuk improve query performance
CREATE INDEX IF NOT EXISTS idx_shipping_history_order_id ON shipping_history(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_history_created_at ON shipping_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipping_history_order_created ON shipping_history(order_id, created_at DESC);

-- Add comment untuk dokumentasi
COMMENT ON TABLE shipping_history IS 'Riwayat tracking pengiriman dari Biteship webhook. Setiap update status akan insert row baru.';
COMMENT ON COLUMN shipping_history.order_id IS 'Foreign key ke orders table';
COMMENT ON COLUMN shipping_history.event_type IS 'Tipe event: order.status atau order.waybill_id';
COMMENT ON COLUMN shipping_history.biteship_status IS 'Status asli dari Biteship (confirmed, picked, delivered, etc)';
COMMENT ON COLUMN shipping_history.status_display IS 'Status dalam bahasa Indonesia yang user-friendly';
COMMENT ON COLUMN shipping_history.courier_name IS 'Nama ekspedisi (JNE, SiCepat, JNT, etc)';
COMMENT ON COLUMN shipping_history.courier_tracking_id IS 'Biteship internal tracking ID';
COMMENT ON COLUMN shipping_history.courier_waybill_id IS 'Nomor resi dari ekspedisi';
COMMENT ON COLUMN shipping_history.note IS 'Catatan tambahan dari webhook (optional)';
COMMENT ON COLUMN shipping_history.location IS 'Lokasi terakhir paket (optional)';
COMMENT ON COLUMN shipping_history.webhook_payload IS 'Full webhook payload dalam format JSON untuk debugging';

-- Enable Row Level Security (RLS) - user hanya bisa lihat history order mereka sendiri
ALTER TABLE shipping_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own order's shipping history
CREATE POLICY "Users can view their own shipping history"
  ON shipping_history
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role can insert/update/delete (untuk webhook)
CREATE POLICY "Service role can manage all shipping history"
  ON shipping_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
