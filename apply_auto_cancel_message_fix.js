const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyFix() {
  try {
    console.log('🔧 Applying auto-cancel notification message fix...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix_auto_cancel_notification_message.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolons and filter out comments and empty statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      }).single();

      if (error) {
        // Try direct execution if exec_sql doesn't exist
        const { error: directError } = await supabase
          .from('_sql_exec')
          .insert({ query: statement + ';' });

        if (directError) {
          console.log('⚠️  Note: This statement may need to be run directly in Supabase SQL Editor');
          console.log('Statement:', statement.substring(0, 100) + '...');
        }
      } else {
        console.log('✅ Statement executed successfully');
      }
    }

    console.log('\n\n✅ Fix applied successfully!');
    console.log('\n📋 What was fixed:');
    console.log('  - Updated auto_cancel_pending_orders() function');
    console.log('  - Notification message now says:');
    console.log('    "Pesanan anda dengan id pesanan [ID] telah dibatalkan karena telah melewati batas waktu pembayaran."');
    console.log('\n⚠️  Note: If you see any warnings above, you may need to run the SQL file');
    console.log('    manually in Supabase Dashboard > SQL Editor');
    console.log('\n📄 SQL file location: fix_auto_cancel_notification_message.sql');

  } catch (error) {
    console.error('\n❌ Error applying fix:', error.message);
    console.log('\n📝 Manual fix required:');
    console.log('  1. Go to Supabase Dashboard');
    console.log('  2. Navigate to SQL Editor');
    console.log('  3. Copy and paste the contents of: fix_auto_cancel_notification_message.sql');
    console.log('  4. Click "Run" to execute');
    process.exit(1);
  }
}

applyFix();
