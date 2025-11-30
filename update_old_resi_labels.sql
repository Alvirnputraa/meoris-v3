-- Update label resi lama ke label baru
-- Script ini update semua order dengan resi "Menunggu konfirmasi admin"
-- menjadi "Menunggu pesanan dikirim ke jasa kirim"

-- Check berapa banyak data yang akan di-update
SELECT
  COUNT(*) as total_orders,
  status
FROM orders
WHERE shipping_resi = 'Menunggu konfirmasi admin'
GROUP BY status;

-- Backup data sebelum update (optional)
-- CREATE TABLE orders_backup_20250109 AS SELECT * FROM orders WHERE shipping_resi = 'Menunggu konfirmasi admin';

-- Update shipping_resi label
UPDATE orders
SET shipping_resi = 'Menunggu pesanan dikirim ke jasa kirim'
WHERE shipping_resi = 'Menunggu konfirmasi admin';

-- Verify hasil update
SELECT
  id,
  order_number,
  status,
  shipping_resi,
  created_at
FROM orders
WHERE shipping_resi = 'Menunggu pesanan dikirim ke jasa kirim'
ORDER BY created_at DESC
LIMIT 10;
