-- COMPLETE FIX untuk RLS used_vouchers table
-- Masalah: Service role tidak bisa insert, client tidak bisa select

-- ========================================
-- STEP 1: Drop ALL existing policies
-- ========================================
DROP POLICY IF EXISTS "Users can view their own used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Authenticated users can insert used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON used_vouchers;
DROP POLICY IF EXISTS "Service role can insert used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "Authenticated users can insert their own used vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "select_own_used_vouchers" ON used_vouchers;
DROP POLICY IF EXISTS "insert_own_used_vouchers" ON used_vouchers;

-- ========================================
-- STEP 2: Create CORRECT policies
-- ========================================

-- Policy 1: Users can SELECT their own used vouchers
-- This allows client-side (browser) to read used vouchers for filtering
CREATE POLICY "select_own_used_vouchers"
  ON used_vouchers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Service role can INSERT any voucher
-- This allows server-side callback to mark vouchers as used
CREATE POLICY "service_role_insert_used_vouchers"
  ON used_vouchers
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy 3: Authenticated users can INSERT their own vouchers (optional, for edge cases)
-- This is a fallback in case client-side needs to mark voucher as used
CREATE POLICY "insert_own_used_vouchers"
  ON used_vouchers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- STEP 3: Make sure RLS is enabled
-- ========================================
ALTER TABLE used_vouchers ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 4: Verify policies are created
-- ========================================
SELECT
  '=== VERIFICATION: RLS Policies ===' as info,
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

-- Expected output should show 3 policies:
-- 1. select_own_used_vouchers (authenticated, SELECT)
-- 2. service_role_insert_used_vouchers (service_role, INSERT)
-- 3. insert_own_used_vouchers (authenticated, INSERT)

-- ========================================
-- STEP 5: Add helpful comments
-- ========================================
COMMENT ON POLICY "select_own_used_vouchers" ON used_vouchers IS
  'Authenticated users can view their own used vouchers (for client-side filtering)';

COMMENT ON POLICY "service_role_insert_used_vouchers" ON used_vouchers IS
  'Service role can insert any used voucher (for server-side callback from Tripay)';

COMMENT ON POLICY "insert_own_used_vouchers" ON used_vouchers IS
  'Authenticated users can insert their own used vouchers (fallback)';

-- ========================================
-- STEP 6: Test queries (optional)
-- ========================================

-- Test as service_role (should work after fix)
-- This simulates what happens in tripay.ts callback
/*
-- Run this with service_role key to test:
INSERT INTO used_vouchers (user_id, voucher_code, order_id, used_at)
VALUES (
  'test-user-id',
  'TEST_VOUCHER',
  'test-order-id',
  NOW()
)
ON CONFLICT (user_id, voucher_code) DO NOTHING;
*/

-- Test as authenticated user (should only see their own vouchers)
-- This simulates what happens in browser
/*
-- Run this as authenticated user to test:
SELECT * FROM used_vouchers WHERE user_id = auth.uid();
*/

-- ========================================
-- DONE!
-- ========================================
-- Now rebuild and restart your app:
-- 1. npm run build
-- 2. pm2 restart meoris-sandal
-- 3. Make a test purchase with voucher
-- 4. Check logs: pm2 logs meoris-sandal
-- 5. Should see: [Tripay] Voucher marked as used: VOUCHERCODE
-- 6. Should see: [Tripay] Inserted data: [...]
-- 7. Verify in DB: SELECT * FROM used_vouchers;
