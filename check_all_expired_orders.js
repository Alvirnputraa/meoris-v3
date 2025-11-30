const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllExpired() {
  console.log('='.repeat(80));
  console.log('🔍 CHECKING ALL EXPIRED ORDERS IN DATABASE');
  console.log('='.repeat(80));

  // Get all submitted checkouts
  const { data: checkouts, error } = await supabase
    .from('checkout_submissions')
    .select('id, payment_reference, status, payment_expired_at, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log(`\nTotal checkout_submissions in database: ${checkouts.length}\n`);

  const now = new Date();
  const submitted = checkouts.filter(c => c.status === 'submitted');
  const cancelled = checkouts.filter(c => c.status === 'cancelled');

  console.log('Status breakdown:');
  console.log(`   - submitted: ${submitted.length}`);
  console.log(`   - cancelled: ${cancelled.length}`);
  console.log(`   - other: ${checkouts.length - submitted.length - cancelled.length}`);

  console.log('\n' + '='.repeat(80));
  console.log('📋 SUBMITTED ORDERS (Belum dibayar):');
  console.log('='.repeat(80));

  if (submitted.length === 0) {
    console.log('\n   No submitted orders found');
  } else {
    submitted.forEach((checkout, idx) => {
      const expiredAt = checkout.payment_expired_at ? new Date(checkout.payment_expired_at) : null;
      const isExpired = expiredAt && now > expiredAt;

      console.log(`\n${idx + 1}. ${checkout.payment_reference || checkout.id}`);
      console.log(`   Created: ${checkout.created_at}`);
      console.log(`   Expired at: ${checkout.payment_expired_at || 'NULL'}`);

      if (expiredAt) {
        const minutesDiff = Math.floor((now - expiredAt) / (1000 * 60));
        if (isExpired) {
          console.log(`   Status: ❌ EXPIRED (${Math.abs(minutesDiff)} minutes ago)`);
          console.log(`   ⚠️  SHOULD BE CANCELLED!`);
        } else {
          console.log(`   Status: ✅ NOT EXPIRED (${-minutesDiff} minutes remaining)`);
        }
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 CANCELLED ORDERS:');
  console.log('='.repeat(80));

  if (cancelled.length === 0) {
    console.log('\n   No cancelled orders found');
  } else {
    cancelled.slice(0, 5).forEach((checkout, idx) => {
      console.log(`\n${idx + 1}. ${checkout.payment_reference || checkout.id}`);
      console.log(`   Created: ${checkout.created_at}`);
      console.log(`   Expired at: ${checkout.payment_expired_at || 'NULL'}`);
    });
    if (cancelled.length > 5) {
      console.log(`\n   ... and ${cancelled.length - 5} more`);
    }
  }

  // Check expired but not cancelled
  const expiredButNotCancelled = submitted.filter(c => {
    const expAt = c.payment_expired_at ? new Date(c.payment_expired_at) : null;
    return expAt && now > expAt;
  });

  console.log('\n' + '='.repeat(80));
  console.log('🚨 EXPIRED BUT NOT CANCELLED:');
  console.log('='.repeat(80));

  if (expiredButNotCancelled.length === 0) {
    console.log('\n✅ GOOD! No expired orders with status=submitted');
    console.log('   Auto-cancel is working correctly!');
  } else {
    console.log(`\n❌ PROBLEM! Found ${expiredButNotCancelled.length} expired order(s) NOT cancelled:\n`);

    expiredButNotCancelled.forEach((checkout, idx) => {
      const expAt = new Date(checkout.payment_expired_at);
      const hoursAgo = ((now - expAt) / (1000 * 60 * 60)).toFixed(2);
      console.log(`${idx + 1}. ${checkout.payment_reference || checkout.id}`);
      console.log(`   Expired: ${hoursAgo} hours ago`);
      console.log(`   Payment expired at: ${checkout.payment_expired_at}`);
    });

    console.log('\n🔍 DIAGNOSIS:');
    console.log('   DATABASE FUNCTION IS NOT WORKING!');
    console.log('\n✅ FIX:');
    console.log('   1. Apply FINAL_SQL_FIX.sql to Supabase');
    console.log('   2. Make sure you see "Success" message');
    console.log('   3. Test again with: node check_all_expired_orders.js');
  }

  // Test function
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING auto_cancel_pending_orders() FUNCTION:');
  console.log('='.repeat(80));

  const { data: result, error: funcError } = await supabase.rpc('auto_cancel_pending_orders');

  if (funcError) {
    console.log('\n❌ Function error:', funcError.message);
  } else {
    console.log('\n✅ Function executed');
    console.log('   Cancelled count:', result?.[0]?.cancelled_count || 0);

    if (expiredButNotCancelled.length > 0 && (result?.[0]?.cancelled_count || 0) === 0) {
      console.log('\n❌ MISMATCH!');
      console.log(`   Expected to cancel: ${expiredButNotCancelled.length}`);
      console.log(`   Actually cancelled: ${result?.[0]?.cancelled_count || 0}`);
      console.log('\n   🔧 ACTION REQUIRED:');
      console.log('   The database function needs to be updated!');
      console.log('   File: FINAL_SQL_FIX.sql');
      console.log('   URL: https://supabase.com/dashboard/project/vtwooclhjobgdgvljauq/sql/new');
    } else if ((result?.[0]?.cancelled_count || 0) > 0) {
      console.log('\n✅ Function worked! Check orders again...');
    }
  }

  console.log('\n' + '='.repeat(80));
}

checkAllExpired().catch(console.error);
