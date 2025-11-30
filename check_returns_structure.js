const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    // Get one return to see all columns
    const { data: returns, error } = await supabase
      .from('returns')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error);
      return;
    }

    if (returns && returns.length > 0) {
      console.log('Returns table columns:');
      console.log(Object.keys(returns[0]).sort().join('\n'));
    } else {
      console.log('No returns found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
})();
