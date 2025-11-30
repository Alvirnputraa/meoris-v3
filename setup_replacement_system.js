const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  try {
    console.log('🚀 Setting up Replacement System...\n');

    // Step 1: Check if tables already exist
    console.log('📋 Step 1: Checking existing tables...');
    const { data: replacementItems, error: checkError } = await supabase
      .from('replacement_items')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      console.log('   ⚠️  Table replacement_items does not exist');
      console.log('   📝 Please run create_replacement_system.sql in Supabase SQL Editor\n');
      console.log('   Steps:');
      console.log('   1. Go to Supabase Dashboard > SQL Editor');
      console.log('   2. Open: create_replacement_system.sql');
      console.log('   3. Click "Run"');
      console.log('   4. Run this script again\n');
      return;
    } else {
      console.log('   ✅ Tables already exist\n');
    }

    // Step 2: Check returns table has new columns
    console.log('📋 Step 2: Checking returns table columns...');
    const { data: returns, error: returnError } = await supabase
      .from('returns')
      .select('replacement_courier, replacement_waybill')
      .limit(1);

    if (returnError) {
      console.log('   ⚠️  New columns not found in returns table');
      console.log('   📝 Please run create_replacement_system.sql\n');
      return;
    } else {
      console.log('   ✅ Returns table updated\n');
    }

    // Step 3: Backup old admin page
    console.log('📋 Step 3: Updating admin returns page...');
    const oldPagePath = path.join(__dirname, 'src/app/admin/returns/page.tsx');
    const newPagePath = path.join(__dirname, 'src/app/admin/returns/page_new.tsx');
    const backupPagePath = path.join(__dirname, 'src/app/admin/returns/page_old_backup.tsx');

    if (fs.existsSync(oldPagePath)) {
      // Backup old file
      fs.copyFileSync(oldPagePath, backupPagePath);
      console.log('   ✅ Backed up old page to page_old_backup.tsx');

      // Copy new file
      if (fs.existsSync(newPagePath)) {
        fs.copyFileSync(newPagePath, oldPagePath);
        console.log('   ✅ Installed new admin returns page\n');
      } else {
        console.log('   ⚠️  page_new.tsx not found, skipping...\n');
      }
    } else {
      console.log('   ⚠️  Admin returns page not found at expected path\n');
    }

    // Step 4: Verify API routes exist
    console.log('📋 Step 4: Verifying API routes...');
    const apiRoutes = [
      'src/app/api/admin/returns/approve/route.ts',
      'src/app/api/admin/returns/reject/route.ts',
      'src/app/api/admin/returns/validate/route.ts',
      'src/app/api/admin/returns/list/route.ts',
      'src/app/api/admin/returns/detail/route.ts',
      'src/app/api/admin/returns/replacement/add-items/route.ts',
      'src/app/api/admin/returns/replacement/ship/route.ts',
    ];

    let allRoutesExist = true;
    apiRoutes.forEach(route => {
      const routePath = path.join(__dirname, route);
      if (fs.existsSync(routePath)) {
        console.log(`   ✅ ${route}`);
      } else {
        console.log(`   ❌ ${route} - NOT FOUND`);
        allRoutesExist = false;
      }
    });

    if (!allRoutesExist) {
      console.log('\n   ⚠️  Some API routes are missing. Please check the files.\n');
    } else {
      console.log('\n   ✅ All API routes exist\n');
    }

    // Step 5: Test database connectivity
    console.log('📋 Step 5: Testing database connectivity...');
    const { data: testData, error: testError } = await supabase
      .from('returns')
      .select('id, status')
      .limit(1);

    if (testError) {
      console.log('   ❌ Database connection failed:', testError.message);
    } else {
      console.log('   ✅ Database connection successful\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════');
    console.log('✨ Setup Complete!\n');
    console.log('📖 Next Steps:');
    console.log('   1. Start your dev server: npm run dev');
    console.log('   2. Login as admin');
    console.log('   3. Go to: http://localhost:3000/admin/returns');
    console.log('   4. Test the complete flow:\n');
    console.log('      a. Approve a pending return');
    console.log('      b. Click Detail on approved return');
    console.log('      c. Add replacement items');
    console.log('      d. Select courier and generate resi\n');
    console.log('📚 Documentation: REPLACEMENT_SYSTEM_SETUP.md');
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setup();
