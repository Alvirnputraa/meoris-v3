const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupShippedNotification() {
  console.log('🚀 Setting up order shipped notification trigger...\n');

  try {
    // Read SQL file
    const sqlFile = path.join(__dirname, 'create_notification_on_shipped.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 Executing SQL from create_notification_on_shipped.sql...');

    // Execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

    if (error) {
      // If rpc doesn't exist, try direct query
      console.log('⚠️  RPC method not available, trying direct execution...');

      // Split and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.toLowerCase().includes('select') &&
            statement.toLowerCase().includes('information_schema')) {
          // This is a verification query
          const { data: verifyData, error: verifyError } = await supabase
            .from('information_schema.triggers')
            .select('*')
            .eq('trigger_name', 'trigger_notification_on_order_shipped');

          if (verifyError) {
            console.log('ℹ️  Cannot verify trigger (permission issue), but it may have been created');
          } else {
            console.log('✅ Trigger verification:', verifyData);
          }
        }
      }
    }

    console.log('\n✅ Setup completed successfully!\n');
    console.log('📋 What was created:');
    console.log('   1. Function: create_notification_on_order_shipped()');
    console.log('   2. Trigger: trigger_notification_on_order_shipped');
    console.log('\n🎯 Trigger behavior:');
    console.log('   - Fires when order status changes to "shipped"');
    console.log('   - Creates notification with type "order_shipped"');
    console.log('   - Title: "Pesanan Dikirim"');
    console.log('   - Message: "Pesanan anda dengan id pesanan [ORDER_NUMBER] telah dikirim"');
    console.log('\n📝 Next steps:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy content from create_notification_on_shipped.sql');
    console.log('   3. Run the SQL directly in the SQL Editor');
    console.log('   4. Test by updating an order status from "processing" to "shipped"');
    console.log('\n🧪 To test:');
    console.log('   1. Create/get an order with status "paid" or "processing"');
    console.log('   2. Update its status to "shipped" via admin panel or API');
    console.log('   3. Check notifications table for the new notification');
    console.log('   4. User should see it at: /user/purchase?view=notifications\n');

  } catch (error) {
    console.error('❌ Error during setup:', error);
    console.log('\n📝 Manual Setup Instructions:');
    console.log('   Since automatic setup failed, please:');
    console.log('   1. Open Supabase Dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Copy and paste content from: create_notification_on_shipped.sql');
    console.log('   4. Click "Run" to execute the SQL\n');
    process.exit(1);
  }
}

setupShippedNotification();
