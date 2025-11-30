const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getOrder() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, shipping_resi, shipping_status')
    .eq('order_number', 'DEV-T44456307467JGRLA')
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (!data) {
    console.log('❌ Order tidak ditemukan');
    return;
  }

  console.log('\n✅ Order ditemukan:');
  console.log('=====================================');
  console.log('UUID:', data.id);
  console.log('Order Number:', data.order_number);
  console.log('Status:', data.status);
  console.log('Resi:', data.shipping_resi || 'Belum ada');
  console.log('Shipping Status:', data.shipping_status || '-');
  console.log('=====================================\n');
}

getOrder();
