-- =============================================
-- FIX RLS POLICIES FOR FAVORIT TABLE
-- =============================================

-- Drop existing favorit policies
DROP POLICY IF EXISTS "Users can view own favorites" ON favorit;
DROP POLICY IF EXISTS "Users can insert own favorites" ON favorit;
DROP POLICY IF EXISTS "Users can delete own favorites" ON favorit;
DROP POLICY IF EXISTS "Service role full access favorit" ON favorit;

-- Temporarily disable RLS to allow operations while we use custom auth
-- This is needed because we're using localStorage-based auth instead of Supabase Auth
-- In production, you should implement proper Supabase Auth or use service role
ALTER TABLE favorit DISABLE ROW LEVEL SECURITY;

-- Alternatively, if you want to keep RLS enabled, you can use these policies instead:
-- CREATE POLICY "Allow all operations on favorit" ON favorit FOR ALL USING (true);

-- Re-enable RLS with permissive policy (choose this approach if you prefer RLS enabled)
-- ALTER TABLE favorit ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all favorit operations" ON favorit FOR ALL USING (true);