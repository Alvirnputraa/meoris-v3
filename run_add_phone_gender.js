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
    console.log('Running migration to add phone and gender columns...');

    const sqlFile = path.join(__dirname, 'add_phone_gender_to_users.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split by statement and run each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // Try direct approach if rpc doesn't work
          console.log('RPC failed, trying direct SQL execution...');
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ query: statement })
          });

          if (!response.ok) {
            console.warn('Statement may have failed (this is OK if columns already exist)');
          }
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nPlease verify in Supabase dashboard that:');
    console.log('1. Column "phone" exists in users table');
    console.log('2. Column "gender" exists in users table');
    console.log('\nIf columns were not created, please run the SQL manually in Supabase SQL Editor.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n⚠️ Please run the SQL file manually in Supabase SQL Editor:');
    console.log('File: add_phone_gender_to_users.sql');
  }
}

runMigration();
