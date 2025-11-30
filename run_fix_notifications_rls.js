require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
  console.log('=== Fixing Notifications RLS Policy ===\n');

  try {
    // Read SQL file
    const sql = fs.readFileSync('./fix_notifications_rls.sql', 'utf8');

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      console.log('Statement:', statement.substring(0, 100) + '...');

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      });

      if (error) {
        console.error('❌ Error:', error.message);

        // Try alternative method: direct query
        console.log('Trying direct query...');
        const { data: directData, error: directError } = await supabase
          .from('notifications')
          .select('*')
          .limit(0); // Just to test connection

        if (directError) {
          console.error('Direct query also failed:', directError);
        }
      } else {
        console.log('✅ Success');
        if (data) {
          console.log('Result:', data);
        }
      }
    }

    console.log('\n=== Attempting to apply RLS policies via SQL ===\n');

    // Since rpc might not work, let's try using the Supabase management API approach
    // We'll construct the SQL and log it for manual execution
    const finalSQL = `
-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create SELECT policy
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create UPDATE policy
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
`;

    console.log('\n=== SQL to execute in Supabase SQL Editor ===');
    console.log(finalSQL);
    console.log('\n=== End of SQL ===\n');

    console.log('Please run the above SQL in your Supabase SQL Editor.');
    console.log('Go to: https://vtwooclhjobgdgvljauq.supabase.co/project/_/sql');

  } catch (error) {
    console.error('Fatal error:', error);
  }
})();
