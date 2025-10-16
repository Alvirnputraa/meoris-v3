-- =============================================
-- ALTER: set default for orders.shipping_resi
-- =============================================

-- Set default message so new rows get this value unless explicitly provided
ALTER TABLE IF EXISTS orders
  ALTER COLUMN shipping_resi SET DEFAULT 'Pesanan belum dikirim ke jasa kirim';

-- Backfill existing NULL values to the default message
UPDATE orders
SET shipping_resi = 'Pesanan belum dikirim ke jasa kirim'
WHERE shipping_resi IS NULL;

