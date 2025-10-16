-- =============================================
-- COMPLETE RLS POLICY FIX FOR USERS TABLE
-- =============================================

-- Drop existing policies that conflict
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can delete own data" ON users;
DROP POLICY IF EXISTS "Allow anonymous signup" ON users;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anonymous users to insert new users (for signup)
CREATE POLICY "Allow anonymous signup" ON users
    FOR INSERT WITH CHECK (true);

-- Policy 2: Allow users to view their own data (requires auth)
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Policy 3: Allow users to update their own data (requires auth)
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Policy 4: Allow users to delete their own data (requires auth)
CREATE POLICY "Users can delete own data" ON users
    FOR DELETE USING (auth.uid()::text = id::text);

-- Policy 5: Allow service role to do everything (for admin operations)
CREATE POLICY "Service role full access" ON users
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.uid()::text = id::text
    );
