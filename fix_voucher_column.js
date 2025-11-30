// Simple script to verify and guide you through fixing the voucher table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAndFix() {
  console.log('🔍 Checking voucher table structure...\n');

  try {
    // Try to fetch voucher data including discount_percentage
    const { data, error } = await supabase
      .from('voucher')
      .select('id, voucher, type, total_potongan, discount_percentage, minimal_purchase')
      .limit(1);

    if (error) {
      if (error.message.includes('discount_percentage')) {
        console.log('❌ Error confirmed: discount_percentage column is missing!\n');
        console.log('📋 To fix this, please run the following SQL in your Supabase Dashboard:\n');
        console.log('-----------------------------------------------------------');
        console.log('ALTER TABLE voucher');
        console.log('ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT NULL;');
        console.log('');
        console.log('UPDATE voucher');
        console.log('SET discount_percentage = 15');
        console.log("WHERE type = 'discount' AND discount_percentage IS NULL;");
        console.log('');
        console.log('UPDATE voucher');
        console.log('SET discount_percentage = NULL');
        console.log("WHERE type = 'shipping';");
        console.log('-----------------------------------------------------------\n');
        console.log('💡 Steps:');
        console.log('1. Go to: https://supabase.com/dashboard/project/vtwooclhjobgdgvljauq/editor');
        console.log('2. Click "SQL Editor" in the left sidebar');
        console.log('3. Click "New Query"');
        console.log('4. Paste the SQL above');
        console.log('5. Click "Run" or press Ctrl+Enter');
        console.log('\n✅ After running the SQL, refresh your page and the error should be fixed!');
      } else {
        console.error('❌ Unexpected error:', error);
      }
    } else {
      console.log('✅ Column exists! Voucher data:');
      console.table(data);
      console.log('\n✅ The discount_percentage column is present. Try refreshing your browser!');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkAndFix();
