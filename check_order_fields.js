const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFields() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Checking fields:');
  console.log('subtotal:', data.subtotal);
  console.log('shipping_cost:', data.shipping_cost);
  console.log('discount_amount:', data.discount_amount);
  console.log('payment_status:', data.payment_status);
  console.log('total_amount:', data.total_amount);
}

checkFields();
