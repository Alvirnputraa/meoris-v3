-- Insert voucher ONGKIR7K yang sudah PAID ke used_vouchers
-- Jalankan ini SETELAH fix RLS dengan fix_used_vouchers_rls_COMPLETE.sql

-- Insert data untuk order yang sudah PAID
INSERT INTO used_vouchers (user_id, voucher_code, order_id, used_at)
VALUES (
  'b41ef1ca-f2fb-47df-a4d7-b44fb2c22af3',  -- user_id dari query Anda
  'ONGKIR7K',                               -- voucher_code
  'f23a3880-a10a-4dc8-baa4-81fe5d9e0ddb',   -- order_id
  '2025-11-09 11:41:30.727729+00'           -- created_at dari order (sebagai used_at)
)
ON CONFLICT (user_id, voucher_code) DO NOTHING;

-- Verify insert berhasil
SELECT
  'Insert verification' as info,
  uv.*,
  o.order_number,
  o.status,
  o.total_amount
FROM used_vouchers uv
JOIN orders o ON o.id = uv.order_id
WHERE uv.voucher_code = 'ONGKIR7K'
ORDER BY uv.created_at DESC;

-- Expected: Should return 1 row with voucher ONGKIR7K
