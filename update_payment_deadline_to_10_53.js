const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateDeadline() {
  const orderId = '9cb711fb-1883-4fc4-8f4b-793b255e4bd2';
  const paymentRef = 'DEV-T444563095289GYBH';

  // Set deadline to 18 Nov 2025 10:53:00 WIB (UTC+7)
  // In UTC that's 18 Nov 2025 03:53:00
  const newDeadline = '2025-11-18 10:53:00+07'; // WIB timezone
  const newExpiredTime = Math.floor(new Date('2025-11-18T03:53:00Z').getTime() / 1000);

  console.log('='.repeat(80));
  console.log('🔧 UPDATING PAYMENT DEADLINE');
  console.log('='.repeat(80));
  console.log('Order ID:', orderId);
  console.log('Payment Reference:', paymentRef);
  console.log('New Deadline (WIB):', '18 November 2025 10:53:00');
  console.log('New Deadline (UTC):', new Date('2025-11-18T03:53:00Z').toISOString());
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
  console.log('Deadline (WIB):', '18 November 2025 10:53:00');
  console.log('Deadline (UTC):', expiryDate.toISOString());
  console.log('Time until expiry:', minutesUntilExpiry, 'minutes');

  if (minutesUntilExpiry < 0) {
    console.log('⚠️  This deadline is in the PAST - order will be cancelled on next cron run');
  } else {
    console.log('✅ Deadline is', minutesUntilExpiry, 'minutes from now');
  }
  console.log('='.repeat(80));
}

updateDeadline().catch(console.error);
