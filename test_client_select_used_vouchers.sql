-- Test apakah client (authenticated user) bisa SELECT used_vouchers mereka sendiri

-- ========================================
-- Step 1: Check RLS Policies
-- ========================================
SELECT
  '=== RLS POLICIES CHECK ===' as info,
  policyname,
  roles,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'used_vouchers'
ORDER BY policyname;

-- Expected: Harus ada policy "select_own_used_vouchers" dengan roles = {authenticated}

-- ========================================
-- Step 2: Check Data in used_vouchers
-- ========================================
SELECT
  '=== DATA IN used_vouchers ===' as info,
  *
FROM used_vouchers
ORDER BY created_at DESC;

-- Expected: Should show both ONGKIR7K and 15KLETSGO

-- ========================================
-- Step 3: Simulate Client Query (as authenticated user)
-- ========================================
-- This simulates what happens in Header.tsx line 250-253
-- NOTE: This query will work in SQL Editor because you're using service_role
-- But in browser, it uses anon key + auth token

SELECT
  '=== SIMULATED CLIENT QUERY ===' as info,
  voucher_code
FROM used_vouchers
WHERE user_id = 'b41ef1ca-f2fb-47df-a4d7-b44fb2c22af3'
ORDER BY created_at DESC;

-- Expected: Should return both voucher codes
-- If this works in SQL Editor but not in browser, it's RLS issue

-- ========================================
-- Step 4: Check if SELECT policy exists and is correct
-- ========================================
SELECT
  '=== DETAILED POLICY CHECK ===' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'used_vouchers'
  AND cmd = 'SELECT'
  AND 'authenticated' = ANY(roles);

-- Expected: Should return 1 row with policyname = 'select_own_used_vouchers'
-- If empty, the SELECT policy is missing or wrong!

-- ========================================
-- DIAGNOSIS
-- ========================================

-- If Step 4 returns empty, run this fix:
/*
DROP POLICY IF EXISTS "select_own_used_vouchers" ON used_vouchers;

CREATE POLICY "select_own_used_vouchers"
  ON used_vouchers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Then test again in browser
*/
