const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyFix() {
  console.log('='.repeat(80));
  console.log('🔧 APPLYING FIX FOR AUTO-CANCEL FUNCTION');
  console.log('='.repeat(80));

  // Read the SQL file
  const sqlFile = path.join(__dirname, 'fix_auto_cancel_pending_orders.sql');

  if (!fs.existsSync(sqlFile)) {
    console.log('❌ File not found:', sqlFile);
    return;
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('\n1️⃣ Reading SQL from:', sqlFile);
  console.log('   File size:', sql.length, 'characters');

  console.log('\n2️⃣ Applying fix to database...');
  console.log('   This will replace the auto_cancel_pending_orders function');

  // Note: Supabase doesn't have a direct way to execute raw SQL via the JS client
  // We need to execute this in parts or use the REST API

  console.log('\n⚠️  IMPORTANT:');
  console.log('   The JavaScript client cannot execute raw SQL directly.');
  console.log('   \n   Please apply the fix manually by:');
  console.log('   \n   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
  console.log('   2. Copy the content from: fix_auto_cancel_pending_orders.sql');
  console.log('   3. Paste and run it in the SQL Editor');
  console.log('   \n   OR use Supabase CLI:');
  console.log('   supabase db push --dry-run');

  console.log('\n3️⃣ For now, let me try to test if we can manually cancel the order...');

  // Manually cancel the expired checkout
  const { data: expiredCheckouts } = await supabase
    .from('checkout_submissions')
    .select('id, payment_reference, payment_expired_at')
    .eq('status', 'submitted')
    .not('payment_expired_at', 'is', null);

  const now = new Date();
  const expired = expiredCheckouts.filter(c => new Date(c.payment_expired_at) < now);

  console.log(`\n   Found ${expired.length} expired checkouts to cancel manually`);

  for (const checkout of expired) {
    console.log(`\n   Cancelling: ${checkout.payment_reference}...`);

    const { error } = await supabase
      .from('checkout_submissions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', checkout.id);

    if (error) {
      console.log('   ❌ Error:', error.message);
    } else {
      console.log('   ✅ Successfully cancelled!');

      // Create notification
      const { data: checkoutData } = await supabase
        .from('checkout_submissions')
        .select('user_id')
        .eq('id', checkout.id)
        .single();

      if (checkoutData?.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: checkoutData.user_id,
            title: 'Pesanan dibatalkan',
            message: `Pesanan dengan nomor ${checkout.payment_reference} telah dibatalkan karena melewati batas waktu pembayaran.`,
            type: 'order_cancelled',
            created_at: new Date().toISOString()
          });
        console.log('   ✅ Notification created');
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ MANUAL CANCELLATION COMPLETED');
  console.log('='.repeat(80));
  console.log('\n⚠️  NEXT STEPS:');
  console.log('1. Apply the SQL fix from fix_auto_cancel_pending_orders.sql to Supabase');
  console.log('2. This will ensure future orders are cancelled automatically');
  console.log('='.repeat(80));
}

applyFix().catch(console.error);
