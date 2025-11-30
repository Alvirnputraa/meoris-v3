const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateProcessingToShipped() {
  console.log('\n🔄 Mencari order dengan status processing yang sudah punya resi...\n');

  // Get all processing orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, status, shipping_resi, shipping_status')
    .eq('status', 'processing');

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log(`📦 Total order dengan status processing: ${orders.length}`);

  // Filter yang sudah punya resi valid
  const ordersWithResi = orders.filter(order => {
    const hasRealResi = order.shipping_resi &&
                       !order.shipping_resi.startsWith('Menunggu') &&
                       order.shipping_resi.length > 10;
    return hasRealResi;
  });

  console.log(`✅ Order yang sudah punya resi: ${ordersWithResi.length}\n`);

  if (ordersWithResi.length === 0) {
    console.log('✅ Tidak ada order yang perlu diupdate.');
    return;
  }

  console.log('Order yang akan diupdate:\n');
  ordersWithResi.forEach(order => {
    console.log(`  - ${order.order_number}`);
    console.log(`    Status: processing → shipped`);
    console.log(`    Resi: ${order.shipping_resi}`);
    console.log('');
  });

  console.log('🔄 Melakukan update...\n');

  // Update each order
  let successCount = 0;
  let failCount = 0;

  for (const order of ordersWithResi) {
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        shipping_status: 'Pesanan siap dikirim'
      })
      .eq('id', order.id);

    if (updateError) {
      console.log(`❌ Gagal update ${order.order_number}:`, updateError.message);
      failCount++;
    } else {
      console.log(`✅ Berhasil update ${order.order_number} → shipped`);
      successCount++;
    }
  }

  console.log('\n================================');
  console.log('📊 SUMMARY');
  console.log('================================');
  console.log(`Total diupdate: ${ordersWithResi.length}`);
  console.log(`Berhasil: ${successCount}`);
  console.log(`Gagal: ${failCount}`);
  console.log('================================\n');
}

updateProcessingToShipped();
