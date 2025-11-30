const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Starting migration: add_discount_percentage_to_voucher...');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'add_discount_percentage_to_voucher.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split SQL file into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.toLowerCase().startsWith('select')) {
        // For SELECT statements, use .from() query
        console.log(`Executing statement ${i + 1}: Verification query...`);
        const { data, error } = await supabase
          .from('voucher')
          .select('id, voucher, type, total_potongan, discount_percentage, minimal_purchase, expired')
          .order('created_at', { ascending: false });

        if (error) {
          console.error(`Error in statement ${i + 1}:`, error);
        } else {
          console.log(`✓ Success! Found ${data.length} vouchers:`);
          console.table(data);
        }
      } else {
        // For ALTER TABLE and UPDATE statements, use rpc or raw query
        console.log(`Executing statement ${i + 1}...`);
        console.log(`SQL: ${statement.substring(0, 100)}...`);

        // Use the Supabase REST API directly for DDL statements
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          // Try alternative: use pg query directly
          console.log('Trying alternative method...');
          const { error } = await supabase.rpc('exec', { sql: statement });
          if (error) {
            console.error(`Error in statement ${i + 1}:`, error);
          } else {
            console.log(`✓ Statement ${i + 1} executed successfully`);
          }
        } else {
          console.log(`✓ Statement ${i + 1} executed successfully`);
        }
      }
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nVerifying the discount_percentage column...');

    // Final verification
    const { data: vouchers, error: verifyError } = await supabase
      .from('voucher')
      .select('id, voucher, type, total_potongan, discount_percentage, minimal_purchase')
      .order('created_at', { ascending: false })
      .limit(5);

    if (verifyError) {
      console.error('Verification error:', verifyError);
    } else {
      console.log('\n✓ Verification successful! Sample vouchers:');
      console.table(vouchers);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
