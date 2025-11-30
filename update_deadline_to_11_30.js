const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateDeadline() {
  const orderId = '9fbf1f3b-ac2e-467b-94a7-3969157c1633';
  const paymentRef = 'DEV-T44456309544KBIRG';

  // Set deadline to 18 Nov 2025 11:30:00 WIB (UTC+7)
  // In UTC that's 18 Nov 2025 04:30:00
  const newDeadline = '2025-11-18 11:30:00+07'; // WIB timezone
  const newExpiredTime = Math.floor(new Date('2025-11-18T04:30:00Z').getTime() / 1000);

  console.log('='.repeat(80));
  console.log('🔧 UPDATING PAYMENT DEADLINE');
  console.log('='.repeat(80));
  console.log('Order ID:', orderId);
  console.log('Payment Reference:', paymentRef);
  console.log('New Deadline (WIB):', '18 November 2025 11:30:00');
  console.log('New Deadline (UTC):', new Date('2025-11-18T04:30:00Z').toISOString());
  console.log('='.repeat(80));

  // Check current data
  console.log('\n1️⃣ Checking current data...');
  const { data: before, error: beforeError } = await supabase
    .from('checkout_submissions')
    .select('payment_expired_at, payment_details, order_summary')
    .eq('id', orderId)
    .single();

  if (beforeError) {
    console.log('❌ Error:', beforeError.message);
    return;
  }

  console.log('   Current payment_expired_at:', before.payment_expired_at);

  // Update payment_expired_at
  console.log('\n2️⃣ Updating payment_expired_at...');

  const { error: updateError1 } = await supabase
    .from('checkout_submissions')
    .update({
      payment_expired_at: newDeadline
    })
    .eq('id', orderId);

  if (updateError1) {
    console.log('❌ Error updating payment_expired_at:', updateError1.message);
    return;
  }
  console.log('   ✅ payment_expired_at updated');

  // Update payment_details JSON
  console.log('\n3️⃣ Updating payment_details JSON...');

  const paymentDetails = before.payment_details || {};
  paymentDetails.expired_time = newExpiredTime;

  const { error: updateError2 } = await supabase
    .from('checkout_submissions')
    .update({
      payment_details: paymentDetails
    })
    .eq('id', orderId);

  if (updateError2) {
    console.log('❌ Error updating payment_details:', updateError2.message);
  } else {
    console.log('   ✅ payment_details.expired_time updated');
  }

  // Update order_summary JSON
  console.log('\n4️⃣ Updating order_summary JSON...');

  const orderSummary = before.order_summary || {};
  if (orderSummary.tripay) {
    orderSummary.tripay.expired_time = newExpiredTime;
  }

  const { error: updateError3 } = await supabase
    .from('checkout_submissions')
    .update({
      order_summary: orderSummary
    })
    .eq('id', orderId);

  if (updateError3) {
    console.log('❌ Error updating order_summary:', updateError3.message);
  } else {
    console.log('   ✅ order_summary.tripay.expired_time updated');
  }

  // Verify changes
  console.log('\n5️⃣ Verifying changes...');
  const { data: after, error: afterError } = await supabase
    .from('checkout_submissions')
    .select('payment_expired_at, payment_details, order_summary')
    .eq('id', orderId)
    .single();

  if (afterError) {
    console.log('❌ Error:', afterError.message);
    return;
  }

  console.log('   New payment_expired_at:', after.payment_expired_at);
  console.log('   New payment_details.expired_time:', after.payment_details?.expired_time);
  console.log('   New order_summary.tripay.expired_time:', after.order_summary?.tripay?.expired_time);

  // Calculate time until expiry
  const expiryDate = new Date(after.payment_expired_at);
  const now = new Date();
  const minutesUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60));

  console.log('\n' + '='.repeat(80));
  console.log('✅ UPDATE COMPLETED');
  console.log('='.repeat(80));
  console.log('Deadline (WIB):', '18 November 2025 11:30:00');
  console.log('Deadline (UTC):', expiryDate.toISOString());
  console.log('Current time:', now.toISOString());
  console.log('Time until expiry:', minutesUntilExpiry, 'minutes');

  if (minutesUntilExpiry < 0) {
    console.log('⚠️  This deadline is in the PAST - order will be cancelled on next cron run');
  } else {
    console.log('✅ Deadline is', minutesUntilExpiry, 'minutes from now');
  }
  console.log('='.repeat(80));

  // Test auto-cancel function
  console.log('\n6️⃣ Testing auto-cancel function NOW...');
  const { data: cancelResult, error: cancelError } = await supabase
    .rpc('auto_cancel_pending_orders');

  if (cancelError) {
    console.log('❌ Error running auto_cancel:', cancelError.message);
  } else {
    console.log('✅ Function executed successfully');
    console.log('   Result:', cancelResult);

    if (cancelResult && cancelResult[0]) {
      const count = cancelResult[0].cancelled_count || 0;
      if (count > 0) {
        console.log('   🎉 SUCCESS! Function cancelled', count, 'order(s)');
      } else {
        console.log('   ℹ️  No orders cancelled (deadline not passed yet)');
      }
    }
  }

  // Check order status after
  console.log('\n7️⃣ Checking order status after test...');
  const { data: afterTest } = await supabase
    .from('checkout_submissions')
    .select('status, updated_at')
    .eq('id', orderId)
    .single();

  if (afterTest) {
    console.log('   Status:', afterTest.status);
    console.log('   Updated at:', afterTest.updated_at);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 MONITORING INSTRUCTIONS');
  console.log('='.repeat(80));
  console.log('\nAfter deadline passes (11:30 WIB):');
  console.log('1. Wait max 10 minutes for cron to run');
  console.log('2. Check status: node verify_order_DEV-T44456309544KBIRG.js');
  console.log('3. Check logs: tail -f /var/log/meoris-cron.log');
  console.log('\nOr trigger manually:');
  console.log('curl -H "Authorization: Bearer K3mP9xR7vN2sL5qW8tY4zH6jD1cF0aB3==" \\');
  console.log('  http://localhost:3005/api/cron/auto-cancel-pending-orders');
  console.log('='.repeat(80));
}

updateDeadline().catch(console.error);
