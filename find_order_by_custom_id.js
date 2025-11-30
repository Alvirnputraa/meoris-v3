/**
 * Find order by custom ID (non-UUID format)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findOrder() {
  const searchId = 'DEV-T44456309143I0VOZ';

  console.log('\n=== Finding Order:', searchId, '===\n');

  // 1. Check in checkout_submissions (id column)
  console.log('1. Checking in checkout_submissions by id...');
  const { data: checkouts, error: checkoutError } = await supabase
    .from('checkout_submissions')
    .select('*')
    .eq('id', searchId);

  if (checkoutError) {
    console.log('   ❌ Error:', checkoutError.message);
  } else if (checkouts && checkouts.length > 0) {
    console.log('   ✅ Found in checkout_submissions:');
    checkouts.forEach(c => {
      console.log('   - ID:', c.id);
      console.log('   - Status:', c.status);
      console.log('   - User ID:', c.user_id);
      console.log('   - Created:', c.created_at);
      console.log('   - Total:', c.total);
      console.log('   - Payment Method:', c.payment_method);
    });
  } else {
    console.log('   ❌ Not found in checkout_submissions');
  }

  // 2. Check all orders with custom_id or similar
  console.log('\n2. Checking orders table (all columns)...');
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (ordersError) {
    console.log('   ❌ Error:', ordersError.message);
  } else if (orders && orders.length > 0) {
    console.log('   ✅ Orders table columns:', Object.keys(orders[0]).join(', '));
  }

  // 3. Try to find by any text column that might contain this ID
  console.log('\n3. Searching in all text columns...');

  // Try checkout_submissions with all data
  const { data: allCheckouts, error: allCheckoutsError } = await supabase
    .from('checkout_submissions')
    .select('*')
    .limit(50);

  if (allCheckoutsError) {
    console.log('   ❌ Error:', allCheckoutsError.message);
  } else {
    console.log('   ✅ Total checkout_submissions:', allCheckouts?.length || 0);

    // Find matching ones
    const matching = allCheckouts?.filter(c =>
      c.id === searchId ||
      JSON.stringify(c).includes(searchId)
    );

    if (matching && matching.length > 0) {
      console.log('   ✅ Found matching checkout:');
      console.log(JSON.stringify(matching[0], null, 2));
    } else {
      console.log('   ❌ No matching checkout found');
      console.log('   Sample checkout IDs:');
      allCheckouts?.slice(0, 5).forEach(c => {
        console.log('   -', c.id, '| Status:', c.status, '| User:', c.user_id);
      });
    }
  }

  console.log('\n=== End Search ===\n');
}

findOrder().catch(console.error);
