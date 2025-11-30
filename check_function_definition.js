const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFunction() {
  console.log('='.repeat(80));
  console.log('🔍 CHECKING DATABASE FUNCTION');
  console.log('='.repeat(80));

  // Test 1: Check if function exists and can be called
  console.log('\n1️⃣ Testing if function exists and is callable...');
  const { data: result, error } = await supabase.rpc('auto_cancel_pending_orders');

  if (error) {
    console.log('❌ Function error:', error.message);
    console.log('\n⚠️  Function might not exist or has errors!');
    return;
  }

  console.log('✅ Function exists and executed');
  console.log('   Result:', result);

  // Test 2: Manually check what SHOULD be cancelled
  console.log('\n2️⃣ Checking checkout_submissions table manually...');

  const { data: allCheckouts, error: allError } = await supabase
    .from('checkout_submissions')
    .select('id, payment_reference, status, payment_expired_at, created_at')
    .eq('status', 'submitted');

  if (allError) {
    console.log('❌ Error:', allError.message);
    return;
  }

  console.log(`\n   Found ${allCheckouts.length} checkouts with status='submitted':\n`);

  const now = new Date();
  allCheckouts.forEach((checkout, idx) => {
    const expiredAt = checkout.payment_expired_at ? new Date(checkout.payment_expired_at) : null;
    const isExpired = expiredAt && now > expiredAt;

    console.log(`   ${idx + 1}. ${checkout.payment_reference || checkout.id}`);
    console.log(`      payment_expired_at: ${checkout.payment_expired_at || 'NULL'}`);
    if (expiredAt) {
      console.log(`      Is expired? ${isExpired ? '❌ YES' : '✅ NO'}`);
      if (isExpired) {
        const hoursAgo = ((now - expiredAt) / (1000 * 60 * 60)).toFixed(2);
        console.log(`      Expired ${hoursAgo} hours ago`);
      }
    }
    console.log('');
  });

  // Test 3: Check the exact query that function should use
  console.log('\n3️⃣ Testing the EXACT query from the function...');

  const { data: shouldBeCancelled, error: queryError } = await supabase
    .from('checkout_submissions')
    .select('id, payment_reference, status, payment_expired_at')
    .eq('status', 'submitted')
    .not('payment_expired_at', 'is', null);

  if (queryError) {
    console.log('❌ Error:', queryError.message);
    return;
  }

  console.log(`\n   Query returned ${shouldBeCancelled.length} checkouts`);

  const expired = shouldBeCancelled.filter(c => {
    const expAt = new Date(c.payment_expired_at);
    return now > expAt;
  });

  console.log(`   ${expired.length} of them are EXPIRED:\n`);

  expired.forEach((checkout, idx) => {
    const expAt = new Date(checkout.payment_expired_at);
    const hoursAgo = ((now - expAt) / (1000 * 60 * 60)).toFixed(2);
    console.log(`   ${idx + 1}. ${checkout.payment_reference || checkout.id}`);
    console.log(`      Expired ${hoursAgo} hours ago`);
  });

  // Compare results
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPARISON');
  console.log('='.repeat(80));
  console.log('Function returned cancelled_count:', result?.[0]?.cancelled_count || 0);
  console.log('Expected to cancel:', expired.length);
  console.log('Match?', (result?.[0]?.cancelled_count || 0) === expired.length ? '✅ YES' : '❌ NO');

  if ((result?.[0]?.cancelled_count || 0) !== expired.length) {
    console.log('\n⚠️  MISMATCH DETECTED!');
    console.log('\n🔍 POSSIBLE CAUSES:');
    console.log('   1. Function not updated in database (SQL not applied correctly)');
    console.log('   2. Function using wrong table or column names');
    console.log('   3. Timezone issue in NOW() comparison');
    console.log('   4. RLS (Row Level Security) blocking function');
  }

  console.log('\n' + '='.repeat(80));
  console.log('🔧 NEXT STEPS');
  console.log('='.repeat(80));
  console.log('\n1. Verify SQL was applied in Supabase Dashboard:');
  console.log('   - Go to SQL Editor');
  console.log('   - Run: SELECT proname, prosrc FROM pg_proc WHERE proname = \'auto_cancel_pending_orders\';');
  console.log('\n2. Or re-apply the SQL fix:');
  console.log('   - Open: APPLY_THIS_SQL_FIX.sql');
  console.log('   - Copy and paste into Supabase SQL Editor');
  console.log('   - Click RUN');
  console.log('='.repeat(80));
}

checkFunction().catch(console.error);
