-- Clean up duplicate notification policies
-- Keep only the 'authenticated' role policies, remove 'public' role policies

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create fresh policies for authenticated users only
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Verify - should show only 2 policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;
