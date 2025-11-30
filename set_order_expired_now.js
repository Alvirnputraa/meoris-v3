const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setExpiredNow() {
  const paymentRef = 'DEV-T4445630956080KIP';

  console.log('='.repeat(80));
  console.log('⚡ SETTING ORDER TO EXPIRED (for testing)');
  console.log('='.repeat(80));
  console.log('Order:', paymentRef);

  // Set deadline to 5 minutes ago (already expired)
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const expiredTime = Math.floor(fiveMinutesAgo.getTime() / 1000);

  console.log('\nSetting payment_expired_at to:', fiveMinutesAgo.toISOString());
  console.log('(5 minutes ago from now)');

  // Get current order
  const { data: before } = await supabase
    .from('checkout_submissions')
    .select('payment_expired_at, payment_details, order_summary')
    .eq('payment_reference', paymentRef)
    .single();

  console.log('\nBefore:');
  console.log('   payment_expired_at:', before.payment_expired_at);

  // Update payment_expired_at
  const { error: err1 } = await supabase
    .from('checkout_submissions')
    .update({
      payment_expired_at: fiveMinutesAgo.toISOString()
    })
    .eq('payment_reference', paymentRef);

  if (err1) {
    console.log('❌ Error:', err1.message);
    return;
  }

  // Update payment_details
  const paymentDetails = before.payment_details || {};
  paymentDetails.expired_time = expiredTime;

  await supabase
    .from('checkout_submissions')
    .update({ payment_details: paymentDetails })
    .eq('payment_reference', paymentRef);

  // Update order_summary
  const orderSummary = before.order_summary || {};
  if (orderSummary.tripay) {
    orderSummary.tripay.expired_time = expiredTime;
  }

  await supabase
    .from('checkout_submissions')
    .update({ order_summary: orderSummary })
    .eq('payment_reference', paymentRef);

  // Verify
  const { data: after } = await supabase
    .from('checkout_submissions')
    .select('payment_expired_at, status')
    .eq('payment_reference', paymentRef)
    .single();

  console.log('\n✅ Updated!');
  console.log('   payment_expired_at:', after.payment_expired_at);
  console.log('   Status:', after.status);

  const isExpired = new Date(after.payment_expired_at) < now;
  console.log('   Is Expired?', isExpired ? '✅ YES' : '❌ NO');

  console.log('\n' + '='.repeat(80));
  console.log('🧪 NOW TESTING AUTO-CANCEL FUNCTION');
  console.log('='.repeat(80));

  console.log('\nCalling auto_cancel_pending_orders()...');

  const { data: result, error: funcError } = await supabase.rpc('auto_cancel_pending_orders');

  if (funcError) {
    console.log('❌ Function error:', funcError.message);
    return;
  }

  console.log('✅ Function executed');
  console.log('   Result:', result);
  console.log('   Cancelled count:', result?.[0]?.cancelled_count || 0);

  // Check order status after
  const { data: afterFunc } = await supabase
    .from('checkout_submissions')
    .select('status, updated_at')
    .eq('payment_reference', paymentRef)
    .single();

  console.log('\n📊 RESULT:');
  console.log('   Status:', afterFunc.status);
  console.log('   Updated at:', afterFunc.updated_at);

  if (afterFunc.status === 'cancelled') {
    console.log('\n' + '🎉'.repeat(40));
    console.log('✅ SUCCESS! AUTO-CANCEL WORKED!');
    console.log('🎉'.repeat(40));
    console.log('\n✅ DATABASE FUNCTION IS WORKING CORRECTLY!');
    console.log('✅ Auto-cancel system is FUNCTIONAL!');
  } else {
    console.log('\n' + '❌'.repeat(40));
    console.log('FAILED! AUTO-CANCEL DID NOT WORK!');
    console.log('❌'.repeat(40));
    console.log('\n❌ Order is expired but NOT cancelled');
    console.log('❌ Function returned:', result?.[0]?.cancelled_count || 0);
    console.log('❌ Expected: 1');
    console.log('\n🔧 ACTION REQUIRED:');
    console.log('   SQL fix needs to be applied to Supabase!');
    console.log('   File: FINAL_SQL_FIX.sql');
  }

  console.log('\n' + '='.repeat(80));
}

setExpiredNow().catch(console.error);
