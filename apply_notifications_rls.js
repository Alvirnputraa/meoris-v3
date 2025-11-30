require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
  console.log('=== Applying Notifications RLS Policy ===\n');

  // Step 1: Check current RLS status
  console.log('Step 1: Checking current RLS status...');
  const { data: checkData, error: checkError } = await supabase
    .from('notifications')
    .select('id')
    .limit(1);

  console.log('Current access:', checkError ? '❌ Error: ' + checkError.message : '✅ Can access');

  // Step 2: We need to use SQL directly
  // Since we can't execute arbitrary SQL from JS, we'll provide instructions
  console.log('\n' + '='.repeat(60));
  console.log('MANUAL FIX REQUIRED');
  console.log('='.repeat(60));
  console.log('\nPlease follow these steps:\n');
  console.log('1. Go to Supabase SQL Editor:');
  console.log('   https://vtwooclhjobgdgvljauq.supabase.co/project/_/sql\n');
  console.log('2. Copy and paste the following SQL:\n');
  console.log('='.repeat(60));

  const sql = `-- Fix Notifications RLS Policy
-- This allows authenticated users to view and update their own notifications

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Enable select for authenticated users on their own notifications" ON notifications;
DROP POLICY IF EXISTS "Enable update for authenticated users on their own notifications" ON notifications;

-- Create SELECT policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create UPDATE policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Verify the policies were created
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;`;

  console.log(sql);
  console.log('\n' + '='.repeat(60));
  console.log('\n3. Click "RUN" to execute the SQL\n');
  console.log('4. After running, test the notifications page again\n');
  console.log('='.repeat(60));

  // Alternative: Try to check if we can use the REST API to create policies
  console.log('\n\nAttempting alternative approach via policy creation...\n');

  // Note: This won't work because we need SQL execution, but let's document it
  console.log('⚠️  Cannot create RLS policies via REST API.');
  console.log('    You must use the SQL Editor as instructed above.\n');

  console.log('=== Expected Result ===');
  console.log('After applying the fix:');
  console.log('✅ Users will be able to see their own notifications');
  console.log('✅ Users will be able to mark notifications as read');
  console.log('✅ Users cannot see other users\' notifications');
  console.log('✅ Notifications page will load successfully\n');
})();
