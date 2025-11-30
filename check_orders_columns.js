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

async function checkOrdersColumns() {
  console.log('Checking orders table structure...\n');

  try {
    // Get one order to see all columns
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Orders table columns:');
    console.log(Object.keys(data));
    console.log('\nSample data:');
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Exception:', err.message);
  }
}

checkOrdersColumns();
