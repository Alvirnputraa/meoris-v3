const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    console.log('Checking user phone data for order DEV-T44456308106T2URE...\n');

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, shipping_address, user_id')
      .eq('order_number', 'DEV-T44456308106T2URE')
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return;
    }

    console.log('📦 Order:', {
      order_number: order.order_number,
      user_id: order.user_id,
      shipping_address: order.shipping_address
    });
    console.log();

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, nama, phone, shipping_phone, shipping_street, shipping_postal_code')
      .eq('id', order.user_id)
      .single();

    console.log('👤 User data:', user);
    console.log();

    // Get user addresses
    const { data: addresses, error: addrError } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', order.user_id)
      .order('is_default', { ascending: false });

    console.log('📍 User addresses:', addresses);
    console.log();

    // Analyze phone numbers
    console.log('📞 Phone Analysis:');
    console.log('  - users.phone:', user?.phone || 'NOT SET');
    console.log('  - users.shipping_phone:', user?.shipping_phone || 'NOT SET');
    if (addresses && addresses.length > 0) {
      addresses.forEach((addr, i) => {
        console.log(`  - user_addresses[${i}].phone:`, addr.phone || 'NOT SET', addr.is_default ? '(DEFAULT)' : '');
      });
    } else {
      console.log('  - user_addresses: NO ADDRESSES FOUND');
    }

    // Try parsing from shipping_address
    const addressLines = order.shipping_address?.split('\n').filter(line => line.trim()) || [];
    if (addressLines.length >= 2) {
      console.log('\n  - Parsed from shipping_address:', addressLines[1]?.trim() || 'NONE');
    }

    console.log('\n✅ Fix implemented: API will now fallback to:');
    console.log('   1. Parse from shipping_address');
    console.log('   2. user_addresses.phone (default address)');
    console.log('   3. users.shipping_phone');
    console.log('   4. users.phone');

    // Final validation
    const defaultAddr = addresses?.[0];
    const finalPhone = defaultAddr?.phone || user?.shipping_phone || user?.phone || '';
    console.log('\n🎯 Final phone that will be used:', finalPhone || 'NONE - WILL FAIL');

  } catch (error) {
    console.error('Error:', error);
  }
})();
