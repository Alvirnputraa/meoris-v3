require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setup() {
  console.log('🚀 Setting up Return Expiry System...\n');

  try {
    // Step 1: Add approved_at column
    console.log('📝 Step 1: Adding approved_at column to returns table...');
    const migrationSql = fs.readFileSync('./add_approved_at_to_returns.sql', 'utf8');

    // Note: Direct SQL execution via Supabase client may not work
    // You need to run this manually in Supabase SQL Editor
    console.log('⚠️  Please run the following SQL manually in Supabase SQL Editor:');
    console.log('   File: add_approved_at_to_returns.sql\n');

    // Step 2: Create auto-cancel function
    console.log('📝 Step 2: Creating auto-cancel function...');
    const functionSql = fs.readFileSync('./create_auto_cancel_expired_returns_function.sql', 'utf8');
    console.log('⚠️  Please run the following SQL manually in Supabase SQL Editor:');
    console.log('   File: create_auto_cancel_expired_returns_function.sql\n');

    // Step 3: Update existing approved returns to set approved_at
    console.log('📝 Step 3: Updating existing approved returns...');
    const { data: approvedReturns, error: fetchError } = await supabase
      .from('returns')
      .select('id, updated_at')
      .eq('status', 'approved')
      .is('approved_at', null);

    if (fetchError) {
      console.error('❌ Error fetching approved returns:', fetchError);
    } else if (approvedReturns && approvedReturns.length > 0) {
      console.log(`   Found ${approvedReturns.length} approved returns without approved_at`);

      for (const returnItem of approvedReturns) {
        const { error: updateError } = await supabase
          .from('returns')
          .update({ approved_at: returnItem.updated_at })
          .eq('id', returnItem.id);

        if (updateError) {
          console.error(`   ❌ Failed to update return ${returnItem.id}:`, updateError.message);
        } else {
          console.log(`   ✅ Updated return ${returnItem.id}`);
        }
      }
    } else {
      console.log('   ℹ️  No existing approved returns need updating');
    }

    console.log('\n✅ Setup completed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Run the SQL files in Supabase SQL Editor');
    console.log('   2. Set up cron job to call /api/cron/cancel-expired-returns daily');
    console.log('   3. Test with an approved return');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setup();
