const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, created_at, user_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total orders: ${data.length}\n`);
  
  data.forEach(order => {
    console.log('---');
    console.log('Order Number:', order.order_number);
    console.log('Status:', order.status);
    console.log('User ID:', order.user_id);
    console.log('Created:', new Date(order.created_at).toLocaleString('id-ID'));
  });
}

checkAllOrders();
