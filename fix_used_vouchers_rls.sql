-- Fix RLS policies untuk used_vouchers table
-- Masalah: RLS terlalu ketat sehingga user tidak bisa query used_vouchers mereka sendiri

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view their own used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Authenticated users can insert used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON used_vouchers;
DROP POLICY IF EXISTS "Service role can insert used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Authenticated users can insert their own used vouchers" ON used_vouchers;

-- Disable RLS temporarily to test if that's the issue (OPTIONAL - comment out if not needed)
-- ALTER TABLE used_vouchers DISABLE ROW LEVEL SECURITY;

-- OR: Create proper policies

-- 1. Policy untuk SELECT: Authenticated users bisa melihat voucher mereka sendiri
CREATE POLICY "select_own_used_vouchers"
  ON used_vouchers
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Policy untuk INSERT: Authenticated users bisa insert voucher mereka sendiri
CREATE POLICY "insert_own_used_vouchers"
  ON used_vouchers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Make sure RLS is enabled
ALTER TABLE used_vouchers ENABLE ROW LEVEL SECURITY;

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'used_vouchers'
ORDER BY policyname;

COMMENT ON POLICY "select_own_used_vouchers" ON used_vouchers IS 'Users can view their own used vouchers';
COMMENT ON POLICY "insert_own_used_vouchers" ON used_vouchers IS 'Users can insert their own used vouchers';

-- Test: User harus bisa query used_vouchers mereka sendiri
-- Run this as authenticated user in Supabase client:
-- SELECT * FROM used_vouchers WHERE user_id = auth.uid();
