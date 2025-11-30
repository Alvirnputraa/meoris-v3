require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Running migration: add_return_number_column.sql');

  try {
    const sql = fs.readFileSync('./add_return_number_column.sql', 'utf8');

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      }).catch(async () => {
        // If exec_sql doesn't exist, try direct query
        return await supabase.from('_').select('*').limit(0).then(() => {
          // Fallback: use raw query
          return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql_query: statement })
          }).then(r => r.json());
        });
      });

      if (error) {
        console.error(`❌ Error:`, error);
      } else {
        console.log(`✅ Success`);
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('\n🔍 Verifying returns table...');

    const { data, error } = await supabase
      .from('returns')
      .select('id, return_number, order_id, status')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Verification error:', error);
    } else {
      console.log('\n📊 Latest returns:');
      console.table(data);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
