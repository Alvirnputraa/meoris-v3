const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkNotifications() {
  const userId = 'aa69bd53-8569-4114-8387-3c1a531cec94';

  console.log('='.repeat(80));
  console.log('🔍 CHECKING NOTIFICATIONS');
  console.log('='.repeat(80));
  console.log('User ID:', userId);

  // Check notifications table
  console.log('\n1️⃣ Checking notifications table...');
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log(`   Found ${notifications.length} notifications\n`);

  if (notifications.length === 0) {
    console.log('   No notifications found for this user');
  } else {
    notifications.forEach((notif, idx) => {
      console.log(`${idx + 1}. ${notif.title}`);
      console.log(`   Type: ${notif.type}`);
      console.log(`   Message: ${notif.message}`);
      console.log(`   Created: ${notif.created_at}`);
      console.log('');
    });
  }

  // Check cancelled orders
  console.log('\n2️⃣ Checking cancelled checkout_submissions...');
  const { data: cancelled, error: cancelError } = await supabase
    .from('checkout_submissions')
    .select('id, payment_reference, status, created_at, updated_at')
    .eq('user_id', userId)
    .eq('status', 'cancelled')
    .order('updated_at', { ascending: false });

  if (cancelError) {
    console.log('❌ Error:', cancelError.message);
    return;
  }

  console.log(`   Found ${cancelled.length} cancelled orders\n`);

  cancelled.forEach((order, idx) => {
    console.log(`${idx + 1}. ${order.payment_reference}`);
    console.log(`   ID: ${order.id}`);
    console.log(`   Cancelled at: ${order.updated_at}`);
    console.log('');
  });

  // Check if notifications exist for cancelled orders
  console.log('\n3️⃣ Checking if notifications exist for cancelled orders...');

  for (const order of cancelled) {
    const { data: notif } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'order_cancelled')
      .ilike('message', `%${order.payment_reference}%`);

    if (notif && notif.length > 0) {
      console.log(`   ✅ ${order.payment_reference} - Notification EXISTS`);
    } else {
      console.log(`   ❌ ${order.payment_reference} - Notification MISSING`);
    }
  }

  // Check notifications table structure
  console.log('\n4️⃣ Checking notifications table structure...');
  const { data: sample } = await supabase
    .from('notifications')
    .select('*')
    .limit(1);

  if (sample && sample.length > 0) {
    console.log('   Columns:', Object.keys(sample[0]).join(', '));
  } else {
    console.log('   Table is empty, cannot determine structure');
  }

  console.log('\n' + '='.repeat(80));
}

checkNotifications().catch(console.error);
