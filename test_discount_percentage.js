// Test script untuk verifikasi implementasi discount_percentage
const { createClient } = require('@supabase/supabase-js');

// Konfigurasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDiscountPercentage() {
  console.log('🧪 Testing Discount Percentage Implementation...\n');

  try {
    // 1. Test membaca data deals
    console.log('1️⃣ Testing GET deals...');
    const { data: deals, error: getError } = await supabase
      .from('homepage_section2_deals')
      .select(`
        *,
        produk:produk_id (
          id,
          nama_produk,
          harga
        )
      `)
      .eq('is_active', true)
      .limit(5);

    if (getError) {
      console.error('❌ Error getting deals:', getError);
      return;
    }

    console.log(`✅ Found ${deals.length} active deals`);
    
    // 2. Test struktur data
    console.log('\n2️⃣ Testing data structure...');
    deals.forEach((deal, index) => {
      console.log(`Deal ${index + 1}:`);
      console.log(`  - ID: ${deal.id}`);
      console.log(`  - Produk: ${deal.produk?.nama_produk || 'N/A'}`);
      console.log(`  - Harga Asli: Rp ${deal.produk?.harga || 0}`);
      console.log(`  - Harga Diskon: Rp ${deal.harga_diskon || 0}`);
      console.log(`  - Discount Percentage: ${deal.discount_percentage || 'NULL'}%`);
      console.log(`  - Hasil Perhitungan: ${deal.discount_percentage !== null ? 'From DB' : 'Calculated'}`);
      console.log('');
    });

    // 3. Test create deal dengan discount_percentage
    console.log('3️⃣ Testing CREATE deal with discount_percentage...');
    const testDeal = {
      produk_id: deals[0]?.produk_id || 'test-product-id',
      harga_diskon: 150000,
      discount_percentage: 25,
      urutan_tampilan: 999,
      is_active: false // Test deal, tidak aktif
    };

    const { data: newDeal, error: createError } = await supabase
      .from('homepage_section2_deals')
      .insert([testDeal])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating test deal:', createError);
    } else {
      console.log('✅ Test deal created successfully');
      console.log(`  - Discount Percentage: ${newDeal.discount_percentage}%`);
      
      // 4. Test update deal
      console.log('\n4️⃣ Testing UPDATE deal...');
      const { data: updatedDeal, error: updateError } = await supabase
        .from('homepage_section2_deals')
        .update({
          discount_percentage: 50,
          urutan_tampilan: 998
        })
        .eq('id', newDeal.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating deal:', updateError);
      } else {
        console.log('✅ Deal updated successfully');
        console.log(`  - New Discount Percentage: ${updatedDeal.discount_percentage}%`);
      }

      // 5. Cleanup test deal
      console.log('\n5️⃣ Cleaning up test deal...');
      const { error: deleteError } = await supabase
        .from('homepage_section2_deals')
        .delete()
        .eq('id', newDeal.id);

      if (deleteError) {
        console.error('❌ Error deleting test deal:', deleteError);
      } else {
        console.log('✅ Test deal cleaned up');
      }
    }

    // 6. Test API endpoint
    console.log('\n6️⃣ Testing API endpoint...');
    const response = await fetch(`${supabaseUrl}/rest/v1/homepage_section2_deals?is_active=eq.true&select=*,produk:produk_id(id,nama_produk,harga)`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (response.ok) {
      const apiData = await response.json();
      console.log(`✅ API endpoint working, returned ${apiData.length} deals`);
      
      // Test if discount_percentage field is included
      const hasDiscountPercentage = apiData.some(deal => 
        deal.hasOwnProperty('discount_percentage')
      );
      
      if (hasDiscountPercentage) {
        console.log('✅ discount_percentage field is included in API response');
      } else {
        console.log('❌ discount_percentage field is missing from API response');
      }
    } else {
      console.error('❌ API endpoint error:', response.status, response.statusText);
    }

    console.log('\n🎉 Testing completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run tests
testDiscountPercentage();