const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupNewsletterTable() {
  try {
    console.log('🚀 Setting up newsletter_subscriptions table...\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'create_newsletter_subscriptions_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 SQL to execute:');
    console.log(sql);
    console.log('\n' + '='.repeat(60) + '\n');

    // Check if table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('newsletter_subscriptions')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table newsletter_subscriptions already exists!');
      console.log('📊 Checking structure...\n');

      // Test insert to verify structure
      const testEmail = `test_${Date.now()}@example.com`;
      const { data: testData, error: testError } = await supabase
        .from('newsletter_subscriptions')
        .insert([{ email: testEmail, is_active: true }])
        .select()
        .single();

      if (testError) {
        console.error('❌ Error testing table:', testError);
        console.log('\n💡 You may need to run the SQL manually in Supabase SQL Editor');
      } else {
        console.log('✅ Table structure is correct!');
        console.log('📝 Test data inserted:', testData);

        // Delete test data
        await supabase
          .from('newsletter_subscriptions')
          .delete()
          .eq('email', testEmail);
        console.log('🗑️  Test data cleaned up\n');
      }
    } else {
      console.log('⚠️  Table does not exist or RLS is blocking access');
      console.log('Error:', checkError);
      console.log('\n📋 Please run the SQL manually in Supabase SQL Editor:');
      console.log('1. Go to Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the SQL from: create_newsletter_subscriptions_table.sql');
      console.log('4. Execute the SQL\n');
    }

    console.log('✅ Setup complete!\n');
  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
}

setupNewsletterTable();
