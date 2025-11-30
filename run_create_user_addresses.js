const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Creating user_addresses table...\n');

    const sqlFile = path.join(__dirname, 'create_user_addresses_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('✅ SQL file loaded successfully');
    console.log('\n⚠️  IMPORTANT: Please run this SQL manually in Supabase SQL Editor:\n');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of create_user_addresses_table.sql');
    console.log('4. Click "Run" to execute the migration\n');

    console.log('File location:', sqlFile);
    console.log('\n--- SQL CONTENT START ---\n');
    console.log(sql);
    console.log('\n--- SQL CONTENT END ---\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
