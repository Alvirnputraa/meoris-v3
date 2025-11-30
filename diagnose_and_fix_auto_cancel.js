const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseAndFix() {
  console.log('='.repeat(80));
  console.log('🔧 DIAGNOSE AND FIX AUTO-CANCEL SYSTEM');
  console.log('='.repeat(80));

  // Step 1: Check if function exists
  console.log('\n1️⃣ Checking if auto_cancel_pending_orders function exists...');

  const { data: functions, error: funcError } = await supabase.rpc('auto_cancel_pending_orders');

  if (funcError) {
    console.log('❌ Function error:', funcError.message);
    console.log('\n⚠️  The function might not exist or has errors.');
    console.log('   Recommendation: Apply the fix_auto_cancel_pending_orders.sql');
  } else {
    console.log('✅ Function exists and executed');
    console.log('   Result:', functions);
  }

  // Step 2: Manually check what should be cancelled
  console.log('\n2️⃣ Finding orders that SHOULD be cancelled...');

  const { data: expiredCheckouts, error: checkError } = await supabase
    .from('checkout_submissions')
    .select('id, payment_reference, status, payment_expired_at, created_at')
    .eq('status', 'submitted')
    .not('payment_expired_at', 'is', null);

  if (checkError) {
    console.log('❌ Error:', checkError.message);
    return;
  }

  console.log(`\n   Found ${expiredCheckouts.length} submitted checkouts with payment_expired_at`);

  const now = new Date();
  const expired = expiredCheckouts.filter(c => new Date(c.payment_expired_at) < now);

  console.log(`   ${expired.length} of them are EXPIRED and should be cancelled:\n`);

  expired.forEach((checkout, index) => {
    const expiredAt = new Date(checkout.payment_expired_at);
    const hoursAgo = ((now - expiredAt) / (1000 * 60 * 60)).toFixed(2);
    console.log(`   ${index + 1}. ${checkout.payment_reference}`);
    console.log(`      Expired ${hoursAgo} hours ago`);
  });

  if (expired.length === 0) {
    console.log('\n✅ No expired orders found. System is working correctly!');
    return;
  }

  // Step 3: Recommend fix
  console.log('\n3️⃣ PROBLEM IDENTIFIED:');
  console.log('   ❌ Function returned cancelled_count: 0');
  console.log('   ❌ But we found', expired.length, 'expired orders');
  console.log('\n   This means the database function is NOT working correctly.');

  console.log('\n4️⃣ SOLUTION:');
  console.log('   You need to apply the fixed function to your Supabase database.');
  console.log('   \n   Steps:');
  console.log('   1. Open Supabase Dashboard > SQL Editor');
  console.log('   2. Copy and run the SQL from: fix_auto_cancel_pending_orders.sql');
  console.log('   3. Or run this command:');
  console.log('      node apply_fix_auto_cancel.js');

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log('Orders that should be cancelled:', expired.length);
  console.log('Orders actually cancelled by function:', functions?.[0]?.cancelled_count || 0);
  console.log('Status: ❌ FUNCTION NOT WORKING - NEEDS FIX');
  console.log('='.repeat(80));
}

diagnoseAndFix().catch(console.error);
