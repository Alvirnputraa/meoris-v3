-- =============================================
-- FIX RLS POLICY FOR USERS TABLE - INSERT ONLY
-- =============================================

-- Allow anonymous users to insert new users (for signup)
-- This is the missing policy that causes the RLS violation error
CREATE POLICY "Allow anonymous signup" ON users
    FOR INSERT WITH CHECK (true);
