const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProcessingOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, status, shipping_resi, shipping_status')
    .order('created_at', { ascending: false });

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log('\n📦 Checking orders in PROCESSING tab...\n');

  let processingTabOrders = [];

  orders.forEach(order => {
    const hasRealResi = order.shipping_resi &&
                       !order.shipping_resi.startsWith('Menunggu') &&
                       order.shipping_resi.length > 10;

    // Logic dari filter processing tab
    let isInProcessingTab = false;

    if (order.status === 'processing' || order.status === 'confirmed') {
      if (!hasRealResi) {
        isInProcessingTab = true;
      }
    } else if (order.status === 'paid' && order.shipping_resi) {
      const status = order.shipping_status || '';
      if (status === '' ||
          status === 'Menunggu pesanan diserahkan ke pihak jasa kirim' ||
          status.toLowerCase().includes('dikemas')) {
        isInProcessingTab = true;
      }
    }

    if (isInProcessingTab) {
      processingTabOrders.push(order);
    }
  });

  console.log('================================');
  console.log('📋 Orders in PROCESSING Tab:');
  console.log('================================');

  if (processingTabOrders.length === 0) {
    console.log('(Kosong - tidak ada order)');
  } else {
    processingTabOrders.forEach(order => {
      const hasRealResi = order.shipping_resi &&
                         !order.shipping_resi.startsWith('Menunggu') &&
                         order.shipping_resi.length > 10;

      console.log(`\n📦 Order: ${order.order_number}`);
      console.log(`   Status DB: ${order.status}`);
      console.log(`   Resi: ${order.shipping_resi || 'Belum ada'}`);
      console.log(`   Has Real Resi? ${hasRealResi ? 'YES' : 'NO'}`);
      console.log(`   Shipping Status: ${order.shipping_status || '-'}`);

      // Determine badge label
      let badgeLabel = 'Unknown';
      if (order.status === 'processing') {
        badgeLabel = 'Sedang Dikemas';
      } else if (order.status === 'paid' && order.shipping_resi) {
        badgeLabel = 'Dikirim';
      } else if (order.status === 'paid') {
        badgeLabel = 'Lunas';
      }

      console.log(`   🏷️  Badge Label: "${badgeLabel}"`);
    });
  }

  console.log('\n================================\n');

  if (processingTabOrders.length > 0) {
    console.log('❓ PERTANYAAN:');
    console.log('Apakah order dengan status "processing" di tab processing harus tampil badge "Dikirim"?');
    console.log('Atau tetap "Sedang Dikemas"?');
  }
}

checkProcessingOrders();
