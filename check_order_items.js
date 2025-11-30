const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrderItems() {
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      order_items (
        *
      )
    `)
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Order:', order.order_number);
  console.log('\nOrder Items:');
  console.log(JSON.stringify(order.order_items, null, 2));
}

checkOrderItems();
