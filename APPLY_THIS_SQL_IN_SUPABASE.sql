-- =====================================================
-- FIX NOTIFICATIONS RLS - APPLY THIS IN SUPABASE SQL EDITOR
-- =====================================================
-- URL: https://vtwooclhjobgdgvljauq.supabase.co/project/_/sql
--
-- PROBLEM: Users cannot see their notifications because
-- there is no RLS policy allowing SELECT for authenticated users.
--
-- SOLUTION: Create policies to allow users to:
-- 1. SELECT their own notifications (WHERE user_id = auth.uid())
-- 2. UPDATE their own notifications (for marking as read)
-- =====================================================

-- Step 1: Enable RLS (if not already enabled)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Enable select for authenticated users on their own notifications" ON notifications;
DROP POLICY IF EXISTS "Enable update for authenticated users on their own notifications" ON notifications;
DROP POLICY IF EXISTS "temp_allow_all" ON notifications;

-- Step 3: Create SELECT policy
-- This allows authenticated users to SELECT rows where user_id matches their auth.uid()
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Step 4: Create UPDATE policy
-- This allows users to mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 5: Verify policies were created successfully
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- =====================================================
-- EXPECTED OUTPUT:
-- You should see 2 policies:
-- 1. "Users can update their own notifications" (UPDATE)
-- 2. "Users can view their own notifications" (SELECT)
-- =====================================================
