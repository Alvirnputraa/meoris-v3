/**
 * Update created_at untuk testing payment deadline
 * Target: Deadline = 15 November 2025 pukul 21:00
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateOrderCreatedAt() {
  const paymentReference = 'DEV-T44456309143I0VOZ';

  console.log('\n=== Update Order Created At for Testing ===\n');
  console.log('Payment Reference:', paymentReference);

  // Calculate created_at yang diperlukan
  // Deadline target: 15 Nov 2025 21:00
  // Formula: created_at + 24 jam (rounded up) = deadline
  // Jadi: created_at = 14 Nov 2025 21:00 (atau sebelum 21:00 agar di-round up ke 21:00)

  // Set created_at = 14 Nov 2025 20:30 WIB (UTC+7)
  // 20:30 WIB = 13:30 UTC
  const newCreatedAt = new Date('2025-11-14T13:30:00.000Z'); // 14 Nov 2025 20:30 WIB

  console.log('\nTarget Deadline: 15 November 2025 pukul 21:00');
  console.log('New Created At (WIB):', newCreatedAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
  console.log('New Created At (UTC):', newCreatedAt.toISOString());

  // Calculate expected deadline
  let expectedDeadline = new Date(newCreatedAt.getTime() + (24 * 60 * 60 * 1000));

  // Round UP to next hour
  if (expectedDeadline.getMinutes() > 0 || expectedDeadline.getSeconds() > 0) {
    expectedDeadline.setHours(expectedDeadline.getHours() + 1);
  }
  expectedDeadline.setMinutes(0);
  expectedDeadline.setSeconds(0);
  expectedDeadline.setMilliseconds(0);

  const formattedDeadline = expectedDeadline.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) + ' pukul ' + expectedDeadline.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });

  console.log('\nExpected Deadline After Calculation:');
  console.log('  ', formattedDeadline);

  // Update checkout_submissions
  console.log('\n📝 Updating checkout_submissions...');

  const { data: updateData, error: updateError } = await supabase
    .from('checkout_submissions')
    .update({
      created_at: newCreatedAt.toISOString(),
      updated_at: newCreatedAt.toISOString()
    })
    .eq('payment_reference', paymentReference)
    .select();

  if (updateError) {
    console.log('❌ Error updating:', updateError.message);
    return;
  }

  if (!updateData || updateData.length === 0) {
    console.log('❌ Order not found');
    return;
  }

  console.log('✅ Updated successfully!');
  console.log('\nUpdated Data:');
  console.log('- ID:', updateData[0].id);
  console.log('- Payment Reference:', updateData[0].payment_reference);
  console.log('- Old Created At:', new Date(updateData[0].created_at).toLocaleString('id-ID'));
  console.log('- Status:', updateData[0].status);

  // Verify
  const { data: verifyData, error: verifyError } = await supabase
    .from('checkout_submissions')
    .select('*')
    .eq('payment_reference', paymentReference)
    .single();

  if (verifyError) {
    console.log('\n❌ Error verifying:', verifyError.message);
    return;
  }

  console.log('\n✅ Verification:');
  console.log('- Created At (WIB):', new Date(verifyData.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
  console.log('- Updated At (WIB):', new Date(verifyData.updated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));

  console.log('\n🎯 NOW TEST IN BROWSER:');
  console.log('   URL: http://localhost:3000/user/purchase?view=order-detail&order=' + paymentReference);
  console.log('\n   Expected Warning:');
  console.log('   "Batas waktu pembayaran Anda sampai', formattedDeadline + '"');
  console.log('\n=== Done ===\n');
}

updateOrderCreatedAt().catch(console.error);
