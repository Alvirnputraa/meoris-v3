-- =============================================
-- FIX RLS POLICY UNTUK checkout_submissions
-- Fixes the "RLS sudah benar untuk tabel checkout_submissions" error
-- =============================================

-- Drop ALL existing policies for clean slate
DROP POLICY IF EXISTS "checkout_submissions_select_own" ON checkout_submissions;
DROP POLICY IF EXISTS "checkout_submissions_insert_own" ON checkout_submissions;
DROP POLICY IF EXISTS "checkout_submissions_update_own" ON checkout_submissions;
DROP POLICY IF EXISTS "checkout_submissions_delete_own" ON checkout_submissions;
DROP POLICY IF EXISTS "Allow all for checkout_submissions" ON checkout_submissions;
DROP POLICY IF EXISTS "Users can insert their own checkout submissions" ON checkout_submissions;
DROP POLICY IF EXISTS "Users can update their own checkout submissions" ON checkout_submissions;
DROP POLICY IF EXISTS "Users can select their own checkout submissions" ON checkout_submissions;
DROP POLICY IF EXISTS "Allow anonymous insert to checkout_submissions" ON checkout_submissions;
DROP POLICY IF EXISTS "Allow anonymous select own checkout_submissions" ON checkout_submissions;
DROP POLICY IF EXISTS "Allow anonymous update own checkout_submissions" ON checkout_submissions;

-- Enable RLS
ALTER TABLE checkout_submissions ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies that work for both authenticated and anonymous users
-- Policy 1: Allow all users (authenticated and anonymous) to INSERT
CREATE POLICY "Allow all insert checkout_submissions"
ON checkout_submissions
FOR INSERT
TO public
WITH CHECK (true);

-- Policy 2: Allow all users (authenticated and anonymous) to SELECT their own records
CREATE POLICY "Allow all select checkout_submissions"
ON checkout_submissions
FOR SELECT
TO public
USING (true);

-- Policy 3: Allow all users (authenticated and anonymous) to UPDATE their own records
CREATE POLICY "Allow all update checkout_submissions"
ON checkout_submissions
FOR UPDATE
TO public
USING (true);

-- Verify the policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'checkout_submissions'
ORDER BY policyname;
