-- =============================================
-- ALTER: orders add shipping columns
-- =============================================

ALTER TABLE IF EXISTS orders
  ADD COLUMN IF NOT EXISTS shipping_status TEXT NOT NULL DEFAULT 'Sedang dikemas',
  ADD COLUMN IF NOT EXISTS shipping_resi TEXT;

-- Optional helpful index if you plan to filter by shipping_status
-- CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);

