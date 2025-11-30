-- =====================================================
-- FIX return_replacement_history RLS POLICY
-- =====================================================
-- Ensure users can access replacement shipping history
-- for their own returns
-- =====================================================

-- Enable RLS on return_replacement_history
ALTER TABLE return_replacement_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view replacement history for their returns" ON return_replacement_history;
DROP POLICY IF EXISTS "Enable read access for users" ON return_replacement_history;

-- Create policy: Users can view replacement history for their own returns
-- This policy checks if the user_id in the related return matches auth.uid()
CREATE POLICY "Users can view replacement history for their returns"
ON return_replacement_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM returns
    WHERE returns.id = return_replacement_history.return_id
    AND returns.user_id = auth.uid()
  )
);

-- Verify the policy was created
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'return_replacement_history'
ORDER BY policyname;
