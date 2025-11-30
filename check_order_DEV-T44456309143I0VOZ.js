/**
 * Check order DEV-T44456309143I0VOZ
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrder() {
  const orderId = 'DEV-T44456309143I0VOZ';

  console.log('\n=== Checking Order:', orderId, '===\n');

  // 1. Check in orders table
  console.log('1. Checking in orders table...');
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError) {
    console.log('   ❌ Not found in orders table:', orderError.message);
  } else {
    console.log('   ✅ Found in orders table:');
    console.log('   - Status:', order.status);
    console.log('   - User ID:', order.user_id);
    console.log('   - Created:', order.created_at);
    console.log('   - Total:', order.total_amount);
    console.log('   - Payment Method:', order.payment_method);
  }

  // 2. Check in checkout_submissions table
  console.log('\n2. Checking in checkout_submissions table...');
  const { data: checkout, error: checkoutError } = await supabase
    .from('checkout_submissions')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (checkoutError) {
    console.log('   ❌ Not found in checkout_submissions:', checkoutError.message);
  } else {
    console.log('   ✅ Found in checkout_submissions:');
    console.log('   - ID:', checkout.id);
    console.log('   - Status:', checkout.status);
    console.log('   - User ID:', checkout.user_id);
    console.log('   - Created:', checkout.created_at);
    console.log('   - Total:', checkout.total);
  }

  // 3. Check order items
  if (order) {
    console.log('\n3. Checking order_items...');
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) {
      console.log('   ❌ Error:', itemsError.message);
    } else {
      console.log('   ✅ Found', items?.length || 0, 'items');
    }
  }

  // 4. Check columns in orders table
  console.log('\n4. Checking orders table structure...');
  const { data: columns, error: colError } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (columns && columns[0]) {
    console.log('   Available columns:', Object.keys(columns[0]).join(', '));
  }

  console.log('\n=== End Check ===\n');
}

checkOrder().catch(console.error);
