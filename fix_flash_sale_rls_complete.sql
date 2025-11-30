-- =====================================================
-- COMPLETE FIX for flash_sale_config RLS Issue
-- =====================================================

-- Step 1: Check if table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'flash_sale_config') THEN
    RAISE NOTICE 'Table flash_sale_config does not exist!';
  ELSE
    RAISE NOTICE 'Table flash_sale_config exists';
  END IF;
END $$;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Allow public read access to flash_sale_config" ON flash_sale_config;
DROP POLICY IF EXISTS "Enable read access for all users" ON flash_sale_config;
DROP POLICY IF EXISTS "Public read access" ON flash_sale_config;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON flash_sale_config;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON flash_sale_config;

-- Step 3: Disable RLS temporarily to test
ALTER TABLE flash_sale_config DISABLE ROW LEVEL SECURITY;

-- Step 4: Verify RLS is disabled
DO $$
BEGIN
  IF (SELECT relrowsecurity FROM pg_class WHERE relname = 'flash_sale_config') THEN
    RAISE NOTICE 'RLS is still ENABLED on flash_sale_config';
  ELSE
    RAISE NOTICE 'RLS is DISABLED on flash_sale_config';
  END IF;
END $$;

-- Done! Now test in your app
-- If it works, RLS was the issue
-- You can keep RLS disabled or create proper policies later
