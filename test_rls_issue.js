// Test script untuk memeriksa RLS issue
const { createClient } = require('@supabase/supabase-js');

// Test dengan anon client (seperti yang digunakan di frontend)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSIssue() {
  console.log('🔍 Testing RLS Issue with Anonymous Client...\n');

  try {
    // Test query dengan anon client (seperti di frontend)
    console.log('1️⃣ Testing with ANON client (like frontend)...');
    const { data: anonData, error: anonError } = await anonClient
      .from('homepage_section2_deals')
      .select(`
        id,
        produk_id,
        harga_diskon,
        discount_percentage,
        urutan_tampilan,
        is_active,
        produk:produk_id (
          id,
          nama_produk,
          harga
        )
      `)
      .eq('is_active', true)
      .limit(3);

    if (anonError) {
      console.error('❌ Error with ANON client:', anonError);
      console.error('Error details:', JSON.stringify(anonError, null, 2));
    } else {
      console.log('✅ ANON client results:');
      anonData.forEach((deal, index) => {
        console.log(`Deal ${index + 1}:`);
        console.log(`  - ID: ${deal.id}`);
        console.log(`  - Produk: ${deal.produk?.nama_produk || 'N/A'}`);
        console.log(`  - Harga Asli: ${deal.produk?.harga}`);
        console.log(`  - Harga Diskon: ${deal.harga_diskon}`);
        console.log(`  - Discount Percentage: ${deal.discount_percentage}`);
        console.log(`  - Type: ${typeof deal.discount_percentage}`);
        console.log(`  - Is Null: ${deal.discount_percentage === null}`);
        console.log(`  - Is Undefined: ${deal.discount_percentage === undefined}`);
        console.log('');
      });
    }

    // Test dengan service role key (jika ada)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      console.log('2️⃣ Testing with SERVICE ROLE key...');
      const serviceClient = createClient(supabaseUrl, serviceKey);
      
      const { data: serviceData, error: serviceError } = await serviceClient
        .from('homepage_section2_deals')
        .select(`
          id,
          produk_id,
          harga_diskon,
          discount_percentage,
          urutan_tampilan,
          is_active,
          produk:produk_id (
            id,
            nama_produk,
            harga
          )
        `)
        .eq('is_active', true)
        .limit(3);

      if (serviceError) {
        console.error('❌ Error with SERVICE client:', serviceError);
      } else {
        console.log('✅ SERVICE client results:');
        serviceData.forEach((deal, index) => {
          console.log(`Deal ${index + 1}:`);
          console.log(`  - Discount Percentage: ${deal.discount_percentage}`);
          console.log('');
        });
      }
    }

    // Test API endpoint langsung
    console.log('3️⃣ Testing API endpoint directly...');
    try {
      const apiResponse = await fetch(`${supabaseUrl}/rest/v1/homepage_section2_deals?is_active=eq.true&select=id,produk_id,harga_diskon,discount_percentage,urutan_tampilan,is_active,produk:produk_id(id,nama_produk,harga)&limit=3`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log('✅ API response:');
        apiData.forEach((deal, index) => {
          console.log(`Deal ${index + 1}:`);
          console.log(`  - Discount Percentage: ${deal.discount_percentage}`);
          console.log('');
        });
      } else {
        console.error('❌ API Error:', apiResponse.status, apiResponse.statusText);
        const errorText = await apiResponse.text();
        console.error('Error details:', errorText);
      }
    } catch (apiError) {
      console.error('❌ API fetch error:', apiError);
    }

    console.log('\n🎯 RLS testing completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run test
testRLSIssue();