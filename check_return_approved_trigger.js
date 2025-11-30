// Check the current return approved trigger function in database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrigger() {
  console.log('🔍 Checking return approved notification messages...\n');

  // First, let's check ALL notifications to see what types exist
  console.log('📋 Checking ALL notification types:\n');
  const { data: allTypes, error: typesError } = await supabase
    .from('notifications')
    .select('type')
    .order('created_at', { ascending: false });

  if (!typesError && allTypes) {
    const uniqueTypes = [...new Set(allTypes.map(n => n.type))];
    console.log('Available notification types:', uniqueTypes);
    console.log('');
  }

  // Check for notifications with "pengembalian" in message
  console.log('📋 Fetching all notifications with "pengembalian" in message:\n');
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('id, order_id, type, title, message, created_at')
    .ilike('message', '%pengembalian%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (notifError) {
    console.error('❌ Error fetching notifications:', notifError);
    return;
  }

  if (!notifications || notifications.length === 0) {
    console.log('⚠️  No return_request_approved notifications found');
    console.log('This means either:');
    console.log('1. No returns have been approved yet');
    console.log('2. The trigger has not created any notifications\n');
    return;
  }

  console.log(`Found ${notifications.length} notification(s):\n`);

  let correctCount = 0;
  let wrongCount = 0;

  notifications.forEach((notif, index) => {
    console.log(`${index + 1}. Notification ID: ${notif.id}`);
    console.log(`   Order: ${notif.order_id}`);
    console.log(`   Created: ${notif.created_at}`);
    console.log(`   Message: ${notif.message}`);

    // Extract time from message
    const timeMatch = notif.message.match(/pukul (\d{2}:\d{2})/);
    if (timeMatch) {
      const time = timeMatch[1];
      const minutes = time.split(':')[1];
      if (minutes === '59') {
        console.log(`   ✅ Time format: CORRECT (${time})`);
        correctCount++;
      } else {
        console.log(`   ❌ Time format: WRONG (${time}, should end with :59)`);
        wrongCount++;
      }
    } else {
      console.log('   ⚠️  Could not extract time from message');
    }
    console.log('');
  });

  console.log('─────────────────────────────────');
  console.log(`Summary:`);
  console.log(`  ✅ Correct format: ${correctCount}`);
  console.log(`  ❌ Wrong format: ${wrongCount}`);

  if (wrongCount > 0) {
    console.log('\n💡 Action needed:');
    console.log('1. Run the SQL file: create_notification_on_return_approved.sql');
    console.log('2. This will update the trigger function to use :59 format');
  } else {
    console.log('\n✅ All notifications have correct time format!');
  }
}

checkTrigger().catch(console.error);
