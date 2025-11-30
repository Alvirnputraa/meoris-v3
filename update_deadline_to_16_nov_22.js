/**
 * Update created_at untuk deadline 16 November 2025 pukul 22:00
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateDeadlineTo16Nov22() {
  const paymentReference = 'DEV-T44456309143I0VOZ';

  console.log('\n=== Update Deadline to 16 Nov 2025 22:00 ===\n');

  // Calculate created_at yang diperlukan
  // Deadline target: 16 Nov 2025 22:00 WIB
  // Formula: created_at + 24 jam (rounded up) = deadline
  // Set created_at = 15 Nov 2025 21:30 WIB
  // 21:30 WIB = 14:30 UTC

  const newCreatedAt = new Date('2025-11-15T14:30:00.000Z'); // 15 Nov 2025 21:30 WIB

  console.log('Target Deadline: 16 November 2025 pukul 22:00 WIB');
  console.log('New Created At: 15 November 2025 pukul 21:30 WIB');
  console.log('UTC:', newCreatedAt.toISOString());

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

  console.log('\nExpected Deadline:', formattedDeadline);

  // Update checkout_submissions
  console.log('\n📝 Updating checkout_submissions...');

  const { data: updateData, error: updateError } = await supabase
    .from('checkout_submissions')
    .update({
      created_at: newCreatedAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('payment_reference', paymentReference)
    .select();

  if (updateError) {
    console.log('❌ Error:', updateError.message);
    return;
  }

  if (!updateData || updateData.length === 0) {
    console.log('❌ Order not found');
    return;
  }

  console.log('✅ Updated successfully!');
  console.log('\nUpdated Order:');
  console.log('- ID:', updateData[0].id);
  console.log('- Payment Reference:', updateData[0].payment_reference);
  console.log('- Created At (WIB):', new Date(updateData[0].created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
  console.log('- Status:', updateData[0].status);

  console.log('\n🎯 REFRESH BROWSER:');
  console.log('   http://localhost:3000/user/purchase?view=order-detail&order=' + paymentReference);
  console.log('\n   Expected Warning:');
  console.log('   "Batas waktu pembayaran Anda sampai', formattedDeadline + '"');
  console.log('\n=== Done ===\n');
}

updateDeadlineTo16Nov22().catch(console.error);
