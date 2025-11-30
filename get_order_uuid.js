require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'OK' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getOrderUUID() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, shipping_resi')
    .eq('shipping_resi', 'WYB-1762437620037')
    .single();

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('\n✅ Order Found:');
  console.log('Order Number:', data.order_number);
  console.log('Shipping Resi:', data.shipping_resi);
  console.log('Order UUID:', data.id);
  console.log('\nUse this UUID in the simulation script.\n');
}

getOrderUUID();
