-- Script untuk mengisi used_vouchers dari order yang sudah PAID
-- Jalankan ini SATU KALI untuk migrate data lama

-- Insert voucher yang sudah digunakan dari orders yang status PAID
INSERT INTO used_vouchers (user_id, voucher_code, order_id, used_at, created_at)
SELECT
  o.user_id,
  o.voucher_code,
  o.id as order_id,
  o.created_at as used_at,
  o.created_at
FROM orders o
WHERE
  o.status = 'paid'
  AND o.voucher_code IS NOT NULL
  AND o.voucher_code != ''
  AND NOT EXISTS (
    -- Hanya insert jika belum ada di used_vouchers
    SELECT 1 FROM used_vouchers uv
    WHERE uv.user_id = o.user_id
    AND uv.voucher_code = o.voucher_code
  )
ON CONFLICT (user_id, voucher_code) DO NOTHING;

-- Show hasil migration
SELECT
  COUNT(*) as total_migrated,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT voucher_code) as unique_vouchers
FROM used_vouchers
WHERE created_at >= NOW() - INTERVAL '5 minutes';

-- Verifikasi hasil
SELECT
  uv.voucher_code,
  uv.user_id,
  uv.order_id,
  uv.used_at,
  o.status as order_status,
  o.total_amount
FROM used_vouchers uv
JOIN orders o ON uv.order_id = o.id
ORDER BY uv.created_at DESC
LIMIT 10;
