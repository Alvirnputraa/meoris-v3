-- =============================================
-- FIX RLS POLICY UNTUK checkout_submissions
-- Use this if you are NOT using Supabase Auth on the client
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "checkout_submissions_select_own" ON checkout_submissions;
DROP POLICY IF EXISTS "checkout_submissions_insert_own" ON checkout_submissions;
DROP POLICY IF EXISTS "checkout_submissions_update_own" ON checkout_submissions;
DROP POLICY IF EXISTS "checkout_submissions_delete_own" ON checkout_submissions;

-- Disable RLS temporarily for reset
ALTER TABLE checkout_submissions DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE checkout_submissions ENABLE ROW LEVEL SECURITY;

-- Permissive policies (for development / if no Supabase Auth)
DROP POLICY IF EXISTS "Allow all for checkout_submissions" ON checkout_submissions;
CREATE POLICY "Allow all for checkout_submissions" ON checkout_submissions
  FOR ALL USING (true) WITH CHECK (true);

-- More secure alternative (uncomment if using Supabase Auth)
-- CREATE POLICY "checkout_submissions_select_own" ON checkout_submissions
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "checkout_submissions_insert_own" ON checkout_submissions
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "checkout_submissions_update_own" ON checkout_submissions
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "checkout_submissions_delete_own" ON checkout_submissions
--   FOR DELETE USING (auth.uid() = user_id);
