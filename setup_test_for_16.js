require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupTest() {
  console.log('🧪 Setting up test for 16:00 auto-cancel...\n');
  console.log(`⏰ Current time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);

  try {
    // Step 1: Find approved return without waybill
    console.log('\n📋 Step 1: Finding approved return without shipping...');
    const { data: returns, error: fetchError } = await supabase
      .from('returns')
      .select('id, order_id, order_number, status, return_waybill, approved_at')
      .eq('status', 'approved')
      .is('return_waybill', null)
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching returns:', fetchError);
      return;
    }

    if (!returns || returns.length === 0) {
      console.log('⚠️  No approved returns without waybill found.');
      console.log('   Please approve a return request first.');
      return;
    }

    const returnItem = returns[0];
    console.log('✅ Found return:', {
      id: returnItem.id,
      order_number: returnItem.order_number,
      current_approved_at: returnItem.approved_at
    });

    // Step 2: Calculate approved_at time
    // Goal: Deadline should be before 16:00
    // If cron runs at 16:00, and deadline is 15:59, it should be expired
    // So: approved_at = 16:00 - 2 days = 13 Nov 16:00 - 2 days = 11 Nov 16:00 (but need to be BEFORE that)
    // Let's set: 11 Nov 15:58 - 2 days = 9 Nov 15:58
    // Deadline will be: 11 Nov 15:59 (which is before 16:00)

    const now = new Date();
    // Set approved_at to exactly 2 days + 2 minutes ago
    // So deadline becomes current_hour:59 which is 15:59 (already passed when cron runs at 16:00)
    const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000) - (2 * 60 * 1000)); // 2 days + 2 minutes ago

    console.log('\n📝 Step 2: Setting approved_at for 16:00 test...');
    console.log(`   Current time (WIB): ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
    console.log(`   Setting approved_at to: ${twoDaysAgo.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);

    const { error: updateError } = await supabase
      .from('returns')
      .update({ approved_at: twoDaysAgo.toISOString() })
      .eq('id', returnItem.id);

    if (updateError) {
      console.error('❌ Error updating approved_at:', updateError);
      return;
    }

    console.log('✅ Successfully set approved_at!');

    // Step 3: Calculate and display deadline
    const approvedDate = new Date(twoDaysAgo);
    const deadlineDate = new Date(approvedDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    deadlineDate.setMinutes(59);
    deadlineDate.setSeconds(59);

    console.log('\n📅 Timeline:');
    console.log(`   Approved at: ${approvedDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
    console.log(`   Deadline (UI will show): ${deadlineDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
    console.log(`   Current time: ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
    console.log(`   Cron will run at: 16:00:00 WIB`);
    console.log(`   Status at 16:00: Will be EXPIRED ⚠️`);

    console.log('\n✅ Test setup complete!');
    console.log('\n⏰ NEXT STEPS:');
    console.log('   1. Run: node schedule_cron_at_16.js');
    console.log('   2. Script will automatically trigger cron at 16:00:00');
    console.log('   3. Watch the console for auto-cancel to happen!');
    console.log(`\n🔗 Monitor in browser:`);
    console.log(`   http://localhost:3000/user/purchase?view=order-detail&order=${returnItem.order_id}&action=returnrequest&timeline=return`);

    // Save return ID for scheduler
    const fs = require('fs');
    fs.writeFileSync('.test_return_id', JSON.stringify({
      returnId: returnItem.id,
      orderId: returnItem.order_id,
      orderNumber: returnItem.order_number
    }));

  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }
}

setupTest();
