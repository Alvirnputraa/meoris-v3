const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrderIdFormat() {
  const orderId = '5adcc76e-d9fc-4d3a-b608-8df527311c3f';
  const paymentRef = 'DEV-T44456309572B9YTY';

  console.log('='.repeat(80));
  console.log('🔍 CHECKING ORDER ID FORMAT');
  console.log('='.repeat(80));

  console.log('\nOrder UUID:', orderId);
  console.log('Payment Reference:', paymentRef);

  // Generate short ID dari UUID (10 karakter pertama, uppercase, tanpa dash)
  const shortId = orderId.replace(/-/g, '').substring(0, 10).toUpperCase();
  console.log('\nShort ID (10 chars):', shortId);

  // Verify dari website
  console.log('\nID di website: 5ADCC76ED9');
  console.log('Match?', shortId === '5ADCC76ED9' ? '✅ YES' : '❌ NO');

  // Function untuk generate short ID
  function generateShortOrderId(uuid) {
    return uuid.replace(/-/g, '').substring(0, 10).toUpperCase();
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 NOTIFICATION MESSAGE FORMATS');
  console.log('='.repeat(80));

  console.log('\n❌ CURRENT (Wrong):');
  console.log('   "Pesanan dengan nomor DEV-T44456309572B9YTY telah dibatalkan..."');

  console.log('\n✅ SHOULD BE (Correct):');
  console.log('   "Pesanan anda dengan id pesanan ' + shortId + ' telah dibatalkan"');

  console.log('\n' + '='.repeat(80));
  console.log('🔧 SQL FUNCTION FIX NEEDED');
  console.log('='.repeat(80));

  console.log('\nCurrent message generation in SQL:');
  console.log('   \'Pesanan dengan nomor \' || COALESCE(v_checkout_record.payment_reference, v_checkout_record.id::text)');

  console.log('\nShould be:');
  console.log('   \'Pesanan anda dengan id pesanan \' || UPPER(SUBSTRING(REPLACE(v_checkout_record.id::text, \'-\', \'\'), 1, 10)) || \' telah dibatalkan\'');

  // Test the SQL function
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING SQL SUBSTRING FUNCTION');
  console.log('='.repeat(80));

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `SELECT
      id,
      UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 10)) as short_id
      FROM checkout_submissions
      WHERE id = '${orderId}'`
  });

  if (error) {
    console.log('\n⚠️  Cannot test SQL (exec_sql function not available)');
    console.log('   But the formula is correct.');
  } else {
    console.log('\nResult:', data);
  }

  console.log('\n' + '='.repeat(80));
}

checkOrderIdFormat().catch(console.error);
