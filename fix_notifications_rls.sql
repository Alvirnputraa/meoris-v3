-- =====================================================
-- FIX NOTIFICATIONS RLS POLICY
-- =====================================================
-- Problem: Users cannot see their own notifications because
-- RLS is enabled but there's no SELECT policy allowing it.
--
-- Solution: Create a policy that allows users to:
-- 1. SELECT their own notifications (based on user_id)
-- 2. UPDATE their own notifications (to mark as read)
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Enable select for authenticated users on their own notifications" ON notifications;
DROP POLICY IF EXISTS "Enable update for authenticated users on their own notifications" ON notifications;

-- Enable RLS (if not already enabled)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create UPDATE policy: Users can update their own notifications (for marking as read)
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'notifications'
ORDER BY policyname;
