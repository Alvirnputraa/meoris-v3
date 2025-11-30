-- Debug script untuk cek voucher yang sudah digunakan

-- 1. Cek apakah tabel used_vouchers ada
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_name = 'used_vouchers'
) as table_exists;

-- 2. Cek semua data di used_vouchers
SELECT * FROM used_vouchers ORDER BY created_at DESC LIMIT 10;

-- 3. Cek orders yang punya voucher_code
SELECT
  id,
  user_id,
  status,
  voucher_code,
  discount_amount,
  total_amount,
  created_at
FROM orders
WHERE voucher_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 4. Cek checkout_submissions yang punya voucher_code
SELECT
  id,
  user_id,
  status,
  voucher_code,
  discount_amount,
  total,
  created_at
FROM checkout_submissions
WHERE voucher_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 5. Cek user_vouchers untuk user tertentu (ganti USER_ID_HERE)
-- SELECT
--   uv.id,
--   uv.user_id,
--   v.voucher as voucher_code,
--   v.judul_voucher,
--   v.total_potongan,
--   v.expired,
--   uv.used,
--   uv.claimed_at
-- FROM user_vouchers uv
-- JOIN voucher v ON uv.voucher_id = v.id
-- WHERE uv.user_id = 'USER_ID_HERE'
-- ORDER BY uv.claimed_at DESC;
