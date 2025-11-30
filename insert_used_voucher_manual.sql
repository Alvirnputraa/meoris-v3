-- Manual insert used voucher untuk testing
-- Step by step guide

-- STEP 1: Lihat order yang PAID dan punya voucher
SELECT
  o.id as order_id,
  o.user_id,
  o.status,
  o.voucher_code as direct_voucher,
  o.order_number,
  o.total_amount,
  o.created_at,
  cs.order_summary->>'voucher_code' as summary_voucher
FROM orders o
LEFT JOIN checkout_submissions cs ON cs.id = o.checkout_submission_id
WHERE o.status = 'paid'
ORDER BY o.created_at DESC
LIMIT 10;

-- STEP 2: Pilih salah satu order dari hasil di atas, lalu copy:
-- - order_id
-- - user_id
-- - voucher_code (bisa dari direct_voucher atau summary_voucher)

-- STEP 3: Insert ke used_vouchers (GANTI VALUES dengan data real dari step 2!)
-- Uncomment dan edit baris di bawah:

/*
INSERT INTO used_vouchers (user_id, voucher_code, order_id, used_at)
VALUES (
  'PASTE_USER_ID_HERE',        -- Dari kolom user_id
  'PASTE_VOUCHER_CODE_HERE',   -- Dari kolom direct_voucher atau summary_voucher
  'PASTE_ORDER_ID_HERE',       -- Dari kolom order_id
  NOW()
)
ON CONFLICT (user_id, voucher_code) DO NOTHING;
*/

-- STEP 4: Verify insert berhasil
SELECT
  uv.*,
  o.order_number,
  o.total_amount
FROM used_vouchers uv
JOIN orders o ON o.id = uv.order_id
ORDER BY uv.created_at DESC
LIMIT 5;

-- STEP 5: Check apakah user punya voucher yang sama di user_vouchers
-- (GANTI 'PASTE_USER_ID_HERE' dengan user_id yang sama di step 3)
/*
SELECT
  uv.id,
  v.voucher,
  v.judul_voucher,
  v.total_potongan,
  uv.claimed_at,
  EXISTS (
    SELECT 1 FROM used_vouchers usv
    WHERE usv.user_id = uv.user_id
    AND usv.voucher_code = v.voucher
  ) as is_used
FROM user_vouchers uv
JOIN voucher v ON v.id = uv.voucher_id
WHERE uv.user_id = 'PASTE_USER_ID_HERE'
ORDER BY uv.claimed_at DESC;
*/

-- Jika kolom 'is_used' = true, berarti voucher sudah di-mark sebagai used
-- Sekarang test di browser, voucher tersebut seharusnya HILANG dari list
