/**
 * Check for pending orders that can be used for auto-cancel testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPendingOrders() {
  console.log('🔍 Checking for pending orders...\n');

  try {
    const { data: pendingOrders, error } = await supabase
      .from('orders')
      .select('id, user_id, created_at, status, total_amount')
      .in('status', ['pending', 'belum bayar'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('❌ No pending orders found.');
      console.log('💡 You need to create a test order through checkout.\n');
      return;
    }

    console.log(`✅ Found ${pendingOrders.length} pending order(s):\n`);

    pendingOrders.forEach((order, index) => {
      const createdAt = new Date(order.created_at);
      const now = new Date();
      const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
      const cancelTime = new Date(createdAt.getTime() + (24 * 60 * 60 * 1000) - (60 * 1000));

      console.log(`${index + 1}. Order ID: ${order.id}`);
      console.log(`   User ID: ${order.user_id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${createdAt.toLocaleString('id-ID')}`);
      console.log(`   Age: ${hoursDiff.toFixed(1)} hours`);
      console.log(`   Will cancel at: ${cancelTime.toLocaleString('id-ID')}`);
      console.log(`   Amount: Rp ${order.total_amount?.toLocaleString('id-ID')}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPendingOrders();
