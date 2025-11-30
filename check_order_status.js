const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrderStatus() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, shipping_status, shipping_resi')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Orders status data:');
  data.forEach(order => {
    console.log('\n---');
    console.log('Order:', order.order_number);
    console.log('Status:', order.status);
    console.log('Shipping Status:', order.shipping_status);
    console.log('Resi:', order.shipping_resi);
  });
}

checkOrderStatus();
