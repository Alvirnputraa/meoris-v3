-- =============================================
-- FIX RLS POLICY FOR USERS TABLE
-- =============================================

-- Allow anonymous users to insert new users (for signup)
CREATE POLICY "Allow anonymous signup" ON users
    FOR INSERT WITH CHECK (true);

-- Allow users to view their own data (existing policy)
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own data (existing policy)
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to delete their own data (if needed)
CREATE POLICY "Users can delete own data" ON users
    FOR DELETE USING (auth.uid() = id);
