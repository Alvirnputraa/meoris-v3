const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Running Replacement System Migration...\n');

    // Check if table already exists
    console.log('📋 Checking if replacement_items table exists...');
    const { data: existing, error: checkError } = await supabase
      .from('replacement_items')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('   ✅ Table replacement_items already exists\n');
    } else if (checkError.code === '42P01') {
      console.log('   ⚠️  Table does not exist. Need to run SQL manually.\n');
      console.log('═══════════════════════════════════════════════');
      console.log('📝 MANUAL STEPS REQUIRED:\n');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Open SQL Editor');
      console.log('3. Copy the content from: create_replacement_system.sql');
      console.log('4. Paste and run in SQL Editor');
      console.log('5. Run this script again to verify\n');
      console.log('SQL file location: create_replacement_system.sql');
      console.log('═══════════════════════════════════════════════\n');
      return;
    }

    // Check returns table has new columns
    console.log('📋 Checking returns table for new columns...');
    const { data: returnData, error: returnError } = await supabase
      .from('returns')
      .select('replacement_courier, replacement_waybill, validation_completed_at')
      .limit(1);

    if (returnError) {
      console.log('   ⚠️  New columns not found. Please run SQL migration.\n');
      return;
    } else {
      console.log('   ✅ Returns table has new columns\n');
    }

    // Verify RLS policies
    console.log('📋 Verifying database setup...');

    // Test insert (will fail if RLS not set correctly, but that's ok for now)
    const testReturnId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
    const { error: testError } = await supabase
      .from('replacement_items')
      .select('id')
      .eq('return_id', testReturnId)
      .limit(1);

    if (testError && testError.code !== 'PGRST116') {
      console.log('   ⚠️  Warning: RLS might not be configured correctly');
      console.log('   Error:', testError.message);
    } else {
      console.log('   ✅ Database queries working\n');
    }

    // Check API routes
    console.log('📋 Checking API route files...');
    const routes = [
      'src/app/api/admin/returns/list/route.ts',
      'src/app/api/admin/returns/detail/route.ts',
      'src/app/api/admin/returns/approve/route.ts',
      'src/app/api/admin/returns/reject/route.ts',
      'src/app/api/admin/returns/replacement/add-items/route.ts',
      'src/app/api/admin/returns/replacement/ship/route.ts',
    ];

    let allExist = true;
    routes.forEach(route => {
      if (fs.existsSync(route)) {
        console.log(`   ✅ ${route.split('/').slice(-3).join('/')}`);
      } else {
        console.log(`   ❌ ${route.split('/').slice(-3).join('/')} - MISSING`);
        allExist = false;
      }
    });

    if (!allExist) {
      console.log('\n   ⚠️  Some API routes are missing!\n');
    } else {
      console.log('\n   ✅ All API routes exist\n');
    }

    // Final check - get actual returns data
    console.log('📋 Loading actual returns data...');
    const { data: returns, error: returnsError } = await supabase
      .from('returns')
      .select(`
        id,
        order_number,
        status,
        created_at,
        users:user_id (nama)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (returnsError) {
      console.log('   ❌ Error loading returns:', returnsError.message);
    } else {
      console.log(`   ✅ Found ${returns?.length || 0} returns in database\n`);
      if (returns && returns.length > 0) {
        console.log('   Latest returns:');
        returns.forEach((ret, i) => {
          console.log(`   ${i + 1}. ${ret.order_number} - ${ret.status} - ${ret.users?.nama || 'Unknown'}`);
        });
        console.log('');
      }
    }

    // Success summary
    console.log('═══════════════════════════════════════════════');
    console.log('✅ Migration Verification Complete!\n');
    console.log('🎯 Next Steps:');
    console.log('   1. Restart your dev server if running');
    console.log('   2. Visit: http://localhost:3000/admin/returns');
    console.log('   3. Make sure you are logged in as admin');
    console.log('   4. You should see real data from database!\n');
    console.log('💡 Note: If you see "Unauthorized" error:');
    console.log('   - Admin ID must be stored in localStorage');
    console.log('   - Key: "adminId"');
    console.log('   - Login as admin first\n');
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
