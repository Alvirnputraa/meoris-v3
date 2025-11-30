-- Script untuk mengisi used_vouchers dari checkout_submissions yang sudah PAID
-- Untuk order yang voucher code-nya ada di order_summary

-- Catatan: Script ini menggunakan JSONB extraction untuk order_summary
-- Pastikan order_summary adalah JSONB type

INSERT INTO used_vouchers (user_id, voucher_code, order_id, used_at, created_at)
SELECT DISTINCT ON (cs.user_id, cs.order_summary->>'voucher_code')
  cs.user_id,
  cs.order_summary->>'voucher_code' as voucher_code,
  o.id as order_id,
  cs.created_at as used_at,
  cs.created_at
FROM checkout_submissions cs
LEFT JOIN orders o ON o.checkout_submission_id = cs.id
WHERE
  cs.status = 'paid'
  AND cs.order_summary IS NOT NULL
  AND cs.order_summary->>'voucher_code' IS NOT NULL
  AND cs.order_summary->>'voucher_code' != ''
  AND NOT EXISTS (
    -- Hanya insert jika belum ada di used_vouchers
    SELECT 1 FROM used_vouchers uv
    WHERE uv.user_id = cs.user_id
    AND uv.voucher_code = cs.order_summary->>'voucher_code'
  )
ON CONFLICT (user_id, voucher_code) DO NOTHING;

-- Show hasil migration
SELECT
  'From checkout_submissions' as source,
  COUNT(*) as total_migrated
FROM used_vouchers
WHERE created_at >= NOW() - INTERVAL '5 minutes';

-- Verifikasi hasil
SELECT
  uv.voucher_code,
  uv.user_id,
  uv.order_id,
  uv.used_at
FROM used_vouchers uv
ORDER BY uv.created_at DESC
LIMIT 10;
