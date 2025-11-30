-- =====================================================
-- CHECK RLS STATUS & FIX
-- =====================================================

-- Step 1: Check current RLS status
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
AND tablename = 'flash_sale_config';

-- Step 2: Check existing policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'flash_sale_config';

-- Step 3: FORCE DISABLE RLS (no matter what)
ALTER TABLE public.flash_sale_config DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL policies to be safe
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'flash_sale_config'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.flash_sale_config', policy_record.policyname);
  END LOOP;
END $$;

-- Step 5: Verify RLS is OFF
SELECT
  tablename,
  rowsecurity as rls_still_enabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
AND tablename = 'flash_sale_config';

-- Step 6: Test query (this should work now)
SELECT COUNT(*) as total_records FROM flash_sale_config;
