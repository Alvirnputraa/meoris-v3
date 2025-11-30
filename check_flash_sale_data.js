// Script to check flash sale data
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    envVars[key.trim()] = values.join('=').trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkFlashSaleData() {
  console.log('Checking flash sale deals data...\n');

  const { data, error } = await supabase
    .from('homepage_section2_deals')
    .select(`
      id,
      produk_id,
      discount_percentage,
      harga_diskon,
      is_active,
      produk:produk_id (
        id,
        nama_produk,
        harga
      )
    `)
    .eq('is_active', true)
    .order('urutan_tampilan', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} active flash sale deals:\n`);

  data.forEach((deal, index) => {
    console.log(`${index + 1}. Product: ${deal.produk?.nama_produk || 'N/A'}`);
    console.log(`   Product ID: ${deal.produk_id}`);
    console.log(`   Original Price: Rp ${deal.produk?.harga?.toLocaleString('id-ID') || 'N/A'}`);
    console.log(`   Discount %: ${deal.discount_percentage !== null && deal.discount_percentage !== undefined ? deal.discount_percentage + '%' : 'NULL/UNDEFINED'}`);
    console.log(`   Discounted Price: Rp ${deal.harga_diskon?.toLocaleString('id-ID') || 'N/A'}`);
    console.log(`   Active: ${deal.is_active}`);
    console.log('');
  });

  // Check for products with missing discount percentage
  const missingDiscount = data.filter(deal =>
    deal.discount_percentage === null ||
    deal.discount_percentage === undefined ||
    deal.discount_percentage === 0
  );

  if (missingDiscount.length > 0) {
    console.log('\n⚠️  WARNING: Found products with missing or zero discount percentage:');
    missingDiscount.forEach(deal => {
      console.log(`   - ${deal.produk?.nama_produk} (ID: ${deal.produk_id})`);
    });
  }
}

checkFlashSaleData().catch(console.error);
