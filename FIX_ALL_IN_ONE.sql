-- ========================================
-- ALL-IN-ONE FIX untuk used_vouchers
-- Jalankan seluruh script ini sekali di Supabase SQL Editor
-- ========================================

-- ========================================
-- PART 1: Fix Foreign Key Constraint
-- ========================================
SELECT '========== PART 1: Fixing Foreign Key Constraint ==========' as step;

-- Drop foreign key constraint yang terlalu strict
ALTER TABLE used_vouchers
DROP CONSTRAINT IF EXISTS used_vouchers_user_id_fkey;

-- Ensure index exists untuk performance
CREATE INDEX IF NOT EXISTS idx_used_vouchers_user_id ON used_vouchers(user_id);

SELECT 'Foreign key constraint removed' as status;

-- ========================================
-- PART 2: Fix RLS Policies
-- ========================================
SELECT '========== PART 2: Fixing RLS Policies ==========' as step;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Authenticated users can insert used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON used_vouchers;
DROP POLICY IF EXISTS "Service role can insert used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Authenticated users can insert their own used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "select_own_used_vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "insert_own_used_vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "service_role_insert_used_vouchers" ON used_vouchers;

-- Create CORRECT policies
-- Policy 1: Users can SELECT their own used vouchers
CREATE POLICY "select_own_used_vouchers"
  ON used_vouchers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Service role can INSERT any voucher (CRITICAL for callback!)
CREATE POLICY "service_role_insert_used_vouchers"
  ON used_vouchers
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy 3: Authenticated users can INSERT their own vouchers (fallback)
CREATE POLICY "insert_own_used_vouchers"
  ON used_vouchers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Make sure RLS is enabled
ALTER TABLE used_vouchers ENABLE ROW LEVEL SECURITY;

SELECT 'RLS policies created' as status;

-- ========================================
-- PART 3: Insert Historical Data (ONGKIR7K)
-- ========================================
SELECT '========== PART 3: Inserting Historical Data ==========' as step;

-- Insert ONGKIR7K voucher yang sudah PAID
INSERT INTO used_vouchers (user_id, voucher_code, order_id, used_at)
VALUES (
  'b41ef1ca-f2fb-47df-a4d7-b44fb2c22af3',
  'ONGKIR7K',
  'f23a3880-a10a-4dc8-baa4-81fe5d9e0ddb',
  '2025-11-09 11:41:30.727729+00'
)
ON CONFLICT (user_id, voucher_code) DO NOTHING;

SELECT 'Historical data inserted' as status;

-- ========================================
-- VERIFICATION
-- ========================================
SELECT '========== VERIFICATION ==========' as step;

-- 1. Check RLS Policies
SELECT
  '1. RLS Policies:' as check_section,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'used_vouchers'
ORDER BY policyname;

-- Expected: 3 rows
-- - insert_own_used_vouchers (authenticated, INSERT)
-- - select_own_used_vouchers (authenticated, SELECT)
-- - service_role_insert_used_vouchers (service_role, INSERT)

-- 2. Check Foreign Keys (should be empty)
SELECT
  '2. Foreign Keys (should be empty):' as check_section,
  conname as constraint_name,
  conrelid::regclass as table_name
FROM pg_constraint
WHERE conrelid = 'used_vouchers'::regclass
  AND contype = 'f';

-- Expected: 0 rows (no foreign keys)

-- 3. Check Data
SELECT
  '3. Data in used_vouchers:' as check_section,
  uv.voucher_code,
  uv.user_id,
  o.order_number,
  o.status,
  o.total_amount,
  uv.used_at
FROM used_vouchers uv
JOIN orders o ON o.id = uv.order_id
ORDER BY uv.created_at DESC;

-- Expected: At least 1 row (ONGKIR7K)

-- ========================================
-- SUMMARY
-- ========================================
SELECT
  '========== SUMMARY ==========' as final_check,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'used_vouchers') as rls_policies_count,
  (SELECT COUNT(*) FROM pg_constraint WHERE conrelid = 'used_vouchers'::regclass AND contype = 'f') as foreign_keys_count,
  (SELECT COUNT(*) FROM used_vouchers) as used_vouchers_count;

-- Expected:
-- rls_policies_count: 3
-- foreign_keys_count: 0
-- used_vouchers_count: >= 1

SELECT '========== ALL DONE! ==========' as status;
SELECT 'Next step: Rebuild app (npm run build && pm2 restart meoris-sandal)' as next_action;
