const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrder() {
  const orderNumber = 'DEV-T44456306531CZAIK';

  console.log('\n🔍 Checking order:', orderNumber);
  console.log('='.repeat(60));

  // 1. Find order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, shipping_resi, shipping_status')
    .eq('order_number', orderNumber)
    .single();

  if (orderError) {
    console.error('❌ Error finding order:', orderError.message);
    return;
  }

  if (!order) {
    console.log('❌ Order not found');
    return;
  }

  console.log('\n✅ Order found:');
  console.log('   ID:', order.id);
  console.log('   Order Number:', order.order_number);
  console.log('   Shipping Resi:', order.shipping_resi || '(belum ada)');
  console.log('   Shipping Status:', order.shipping_status || '(belum ada)');

  // 2. Check shipping history
  const { data: history, error: historyError } = await supabase
    .from('shipping_history')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (historyError) {
    console.error('\n❌ Error loading shipping history:', historyError.message);
    return;
  }

  console.log('\n📦 Shipping History:');
  console.log('   Total records:', history?.length || 0);

  if (history && history.length > 0) {
    console.log('\n   Timeline:');
    history.forEach((h, index) => {
      console.log(`   ${index + 1}. [${new Date(h.created_at).toLocaleString('id-ID')}]`);
      console.log(`      Status: ${h.status_display}`);
      console.log(`      Biteship Status: ${h.biteship_status || '-'}`);
      console.log(`      Courier: ${h.courier_name || '-'}`);
      console.log(`      Resi: ${h.courier_waybill_id || '-'}`);
      console.log('');
    });
  } else {
    console.log('   ⚠️  No shipping history records found');
  }
}

checkOrder().catch(console.error);
