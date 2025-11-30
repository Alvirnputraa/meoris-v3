const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let checkInterval;
let checkCount = 0;
const MAX_CHECKS = 30; // Max 30 checks (15 minutes if every 30 seconds)

async function checkOrder() {
  checkCount++;
  const paymentRef = 'DEV-T44456309544KBIRG';

  const now = new Date();
  const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);

  console.log('\n' + '='.repeat(80));
  console.log(`CHECK #${checkCount} - ${timeStr}`);
  console.log('='.repeat(80));

  const { data: order, error } = await supabase
    .from('checkout_submissions')
    .select('id, payment_reference, status, payment_expired_at, updated_at')
    .eq('payment_reference', paymentRef)
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  const expiredAt = new Date(order.payment_expired_at);
  const isExpired = now > expiredAt;
  const minutesDiff = Math.floor((expiredAt - now) / (1000 * 60));

  console.log('\n📦 ORDER STATUS:');
  console.log('   Reference:', order.payment_reference);
  console.log('   Status:', order.status);
  console.log('   Updated at:', order.updated_at);

  console.log('\n⏰ TIME:');
  console.log('   Current:', now.toISOString());
  console.log('   Deadline:', expiredAt.toISOString());

  if (isExpired) {
    console.log('   ⚠️  EXPIRED', Math.abs(minutesDiff), 'minutes ago');
  } else {
    console.log('   ✅ NOT EXPIRED - expires in', minutesDiff, 'minutes');
  }

  // Check if cancelled
  if (order.status === 'cancelled') {
    console.log('\n' + '🎉'.repeat(40));
    console.log('✅ SUCCESS! ORDER HAS BEEN CANCELLED!');
    console.log('🎉'.repeat(40));
    console.log('\n📊 RESULT:');
    console.log('   Auto-cancel function: WORKING ✅');
    console.log('   Order was cancelled at:', order.updated_at);
    console.log('   Total checks needed:', checkCount);
    console.log('\nStopping monitor...');
    clearInterval(checkInterval);
    process.exit(0);
  } else {
    if (isExpired) {
      console.log('\n⏳ Status still "' + order.status + '", waiting for cron job...');
      console.log('   Cron runs every 10 minutes');
    } else {
      console.log('\n⏳ Waiting for deadline to pass...');
    }
  }

  // Stop after max checks
  if (checkCount >= MAX_CHECKS) {
    console.log('\n⚠️  Reached max checks (' + MAX_CHECKS + ')');
    console.log('Stopping monitor...');
    clearInterval(checkInterval);
    process.exit(0);
  }

  console.log('\nNext check in 30 seconds...');
}

async function startMonitor() {
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + '🔍 AUTO-CANCEL MONITOR TEST' + ' '.repeat(30) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  console.log('\n📋 TEST DETAILS:');
  console.log('   Order: DEV-T44456309544KBIRG');
  console.log('   Deadline: 18 November 2025 11:30:00 WIB');
  console.log('   Check interval: Every 30 seconds');
  console.log('   Max duration: 15 minutes');

  console.log('\n⏰ Waiting for deadline and auto-cancel...');
  console.log('   Press Ctrl+C to stop monitoring\n');

  // First check immediately
  await checkOrder();

  // Then check every 30 seconds
  checkInterval = setInterval(checkOrder, 30000);
}

startMonitor().catch(console.error);
