const { createClient } = require('@supabase/supabase-js');

// Kredensial dari file .env
const supabase = createClient('https://vtwooclhjobgdgvljauq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0d29vY2xoam9iZ2RndmxqYXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MjQzNTIsImV4cCI6MjA3NDAwMDM1Mn0.4cnd_WQ26viMhHyyI7thasFmb503xVgvlQ3oeIrUDRs');

async function checkDeals() {
  try {
    const { data, error } = await supabase
      .from('homepage_section2_deals')
      .select(`
        *,
        produk:produk_id (
          id,
          nama_produk,
          harga
        )
      `)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Deals data:', JSON.stringify(data, null, 2));
    
    // Check discount calculation
    data.forEach(deal => {
      const originalPrice = Number(deal.produk?.harga) || 0;
      const discountPrice = Number(deal.harga_diskon) || 0;
      const discountPercentage = (originalPrice > 0 && discountPrice > 0 && discountPrice < originalPrice)
        ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
        : 0;
      
      console.log(`Deal ID: ${deal.id}`);
      console.log(`Product: ${deal.produk?.nama_produk}`);
      console.log(`Original Price: ${originalPrice}`);
      console.log(`Discount Price: ${discountPrice}`);
      console.log(`Discount Percentage: ${discountPercentage}%`);
      console.log('---');
    });
  } catch (err) {
    console.error('Connection error:', err);
  }
}

checkDeals();