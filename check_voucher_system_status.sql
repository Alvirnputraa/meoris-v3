-- Complete system check for voucher tracking
-- Run this in Supabase SQL Editor to verify everything is working

-- ========================================
-- 1. CHECK RLS POLICIES
-- ========================================
SELECT
  '=== RLS POLICIES ===' as check_section,
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'used_vouchers'
ORDER BY policyname;

-- Expected: Should see 2 policies
-- - select_own_used_vouchers (FOR SELECT)
-- - insert_own_used_vouchers (FOR INSERT)

-- ========================================
-- 2. CHECK TABLE STRUCTURE
-- ========================================
SELECT
  '=== TABLE STRUCTURE ===' as check_section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'used_vouchers'
ORDER BY ordinal_position;

-- Expected columns:
-- id, user_id, voucher_code, order_id, used_at, created_at

-- ========================================
-- 3. CHECK USED VOUCHERS DATA
-- ========================================
SELECT
  '=== USED VOUCHERS DATA ===' as check_section,
  uv.voucher_code,
  uv.used_at,
  o.order_number,
  o.status,
  o.total_amount,
  u.email as user_email
FROM used_vouchers uv
JOIN orders o ON o.id = uv.order_id
JOIN auth.users u ON u.id = uv.user_id
ORDER BY uv.created_at DESC
LIMIT 10;

-- Expected: Should show ONGKIR7K with status 'paid'

-- ========================================
-- 4. CHECK PAID ORDERS WITH VOUCHERS
-- ========================================
SELECT
  '=== PAID ORDERS WITH VOUCHERS ===' as check_section,
  o.id as order_id,
  o.user_id,
  o.order_number,
  o.status,
  o.voucher_code as direct_voucher,
  o.discount_amount,
  cs.order_summary->>'voucher_code' as summary_voucher,
  cs.order_summary->>'discount' as summary_discount,
  EXISTS (
    SELECT 1 FROM used_vouchers uv
    WHERE uv.order_id = o.id
  ) as has_used_voucher_entry,
  o.created_at
FROM orders o
LEFT JOIN checkout_submissions cs ON cs.id = o.checkout_submission_id
WHERE o.status = 'paid'
  AND (
    o.voucher_code IS NOT NULL
    OR cs.order_summary->>'voucher_code' IS NOT NULL
  )
ORDER BY o.created_at DESC
LIMIT 10;

-- Expected: All PAID orders with vouchers should have has_used_voucher_entry = true

-- ========================================
-- 5. CHECK ORDERS MISSING used_vouchers ENTRIES
-- ========================================
SELECT
  '=== PAID ORDERS MISSING used_vouchers ENTRIES ===' as check_section,
  o.id as order_id,
  o.user_id,
  o.order_number,
  COALESCE(o.voucher_code, cs.order_summary->>'voucher_code') as voucher_used,
  o.created_at
FROM orders o
LEFT JOIN checkout_submissions cs ON cs.id = o.checkout_submission_id
WHERE o.status = 'paid'
  AND (
    o.voucher_code IS NOT NULL
    OR cs.order_summary->>'voucher_code' IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM used_vouchers uv
    WHERE uv.order_id = o.id
  )
ORDER BY o.created_at DESC;

-- Expected: Should be EMPTY (all paid orders should have entries)
-- If not empty, these orders need manual insertion to used_vouchers

-- ========================================
-- 6. CHECK USER VOUCHERS AVAILABILITY
-- ========================================
-- Replace 'YOUR_USER_ID' with actual user_id from step 4
/*
SELECT
  '=== USER VOUCHERS STATUS ===' as check_section,
  v.voucher as voucher_code,
  v.judul_voucher,
  v.total_potongan,
  v.expired,
  uv.claimed_at,
  CASE
    WHEN v.expired IS NOT NULL AND v.expired < NOW() THEN 'EXPIRED'
    WHEN EXISTS (
      SELECT 1 FROM used_vouchers usv
      WHERE usv.user_id = uv.user_id
      AND usv.voucher_code = v.voucher
    ) THEN 'USED'
    ELSE 'AVAILABLE'
  END as voucher_status
FROM user_vouchers uv
JOIN voucher v ON v.id = uv.voucher_id
WHERE uv.user_id = 'YOUR_USER_ID'
ORDER BY
  CASE
    WHEN v.expired IS NOT NULL AND v.expired < NOW() THEN 3
    WHEN EXISTS (
      SELECT 1 FROM used_vouchers usv
      WHERE usv.user_id = uv.user_id
      AND usv.voucher_code = v.voucher
    ) THEN 2
    ELSE 1
  END,
  uv.claimed_at DESC;
*/

-- Expected: ONGKIR7K should show status = 'USED'

-- ========================================
-- 7. SUMMARY CHECK
-- ========================================
SELECT
  '=== SYSTEM SUMMARY ===' as check_section,
  (SELECT COUNT(*) FROM used_vouchers) as total_used_vouchers,
  (SELECT COUNT(*) FROM orders WHERE status = 'paid' AND voucher_code IS NOT NULL) as paid_orders_with_direct_voucher,
  (SELECT COUNT(*) FROM orders o
   JOIN checkout_submissions cs ON cs.id = o.checkout_submission_id
   WHERE o.status = 'paid' AND cs.order_summary->>'voucher_code' IS NOT NULL
  ) as paid_orders_with_summary_voucher,
  (SELECT COUNT(DISTINCT policyname) FROM pg_policies WHERE tablename = 'used_vouchers') as rls_policies_count;

-- Expected:
-- - rls_policies_count should be 2
-- - total_used_vouchers should be >= 1
-- - sum of paid orders should match or exceed total_used_vouchers

-- ========================================
-- FINAL RECOMMENDATION
-- ========================================
-- If step 5 shows missing entries, run migration:
-- See: migrate_existing_paid_orders_vouchers.sql
-- See: migrate_existing_paid_checkouts_vouchers.sql
