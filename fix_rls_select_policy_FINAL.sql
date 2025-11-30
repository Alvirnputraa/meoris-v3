-- FIX FINAL: RLS SELECT Policy untuk used_vouchers
-- Problem: Query dari client returns empty array padahal data ada

-- ========================================
-- Step 1: Check current policies
-- ========================================
SELECT
  '=== CURRENT POLICIES ===' as step,
  policyname,
  roles,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'used_vouchers'
ORDER BY policyname;

-- ========================================
-- Step 2: Drop ALL policies and recreate from scratch
-- ========================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Authenticated users can insert used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON used_vouchers;
DROP POLICY IF EXISTS "Service role can insert used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Authenticated users can insert their own used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "select_own_used_vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "insert_own_used_vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "service_role_insert_used_vouchers" ON used_vouchers;

-- ========================================
-- Step 3: Create CORRECT policies with proper syntax
-- ========================================

-- Policy 1: Allow authenticated users to SELECT their own used vouchers
CREATE POLICY "select_own_used_vouchers"
  ON used_vouchers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Allow service role to INSERT any voucher (for callback)
CREATE POLICY "service_role_insert_used_vouchers"
  ON used_vouchers
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy 3: Allow authenticated users to INSERT their own vouchers (fallback)
CREATE POLICY "insert_own_used_vouchers"
  ON used_vouchers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- Step 4: Ensure RLS is enabled
-- ========================================
ALTER TABLE used_vouchers ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Step 5: Verify policies created correctly
-- ========================================
SELECT
  '=== VERIFICATION: Policies Created ===' as step,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'used_vouchers'
ORDER BY policyname;

-- Expected output:
-- 1. insert_own_used_vouchers | PERMISSIVE | {authenticated} | INSERT | NULL | (user_id = auth.uid())
-- 2. select_own_used_vouchers | PERMISSIVE | {authenticated} | SELECT | (user_id = auth.uid()) | NULL
-- 3. service_role_insert_used_vouchers | PERMISSIVE | {service_role} | INSERT | NULL | true

-- ========================================
-- Step 6: Test SELECT as authenticated user
-- ========================================
-- This simulates what browser does
SELECT
  '=== TEST: Select as user ===' as step,
  voucher_code,
  user_id,
  created_at
FROM used_vouchers
WHERE user_id = 'b41ef1ca-f2fb-47df-a4d7-b44fb2c22af3'
ORDER BY created_at DESC;

-- Expected: Should return both ONGKIR7K and 15KLETSGO

-- ========================================
-- Step 7: Grant necessary permissions
-- ========================================

-- Ensure authenticated role has SELECT permission on table
GRANT SELECT ON used_vouchers TO authenticated;
GRANT INSERT ON used_vouchers TO authenticated;

-- Ensure service_role has full permissions
GRANT ALL ON used_vouchers TO service_role;

-- Verify grants
SELECT
  '=== VERIFICATION: Grants ===' as step,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'used_vouchers'
ORDER BY grantee, privilege_type;

-- ========================================
-- DONE!
-- ========================================
SELECT '=== FIX COMPLETE ===' as status;
SELECT 'Now refresh browser with Ctrl+Shift+R and test again' as next_action;
