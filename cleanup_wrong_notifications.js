// Delete old notifications with wrong time format
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase service role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupWrongNotifications() {
  console.log('🧹 Cleaning up old notifications with wrong time format...\n');

  // IDs of notifications with wrong time format
  const wrongNotificationIds = [
    '119d8508-3f03-4789-b4f5-ea660f075922', // 16:07
    'cd7c4cd7-a165-48f9-b52c-b883fde06959', // 09:07
  ];

  console.log(`Deleting ${wrongNotificationIds.length} old notifications:\n`);

  for (const id of wrongNotificationIds) {
    console.log(`  Deleting notification: ${id}`);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`    ❌ Error:`, error.message);
    } else {
      console.log(`    ✅ Deleted`);
    }
  }

  console.log('\n✅ Cleanup complete!\n');

  // Verify remaining notifications
  console.log('📋 Remaining return_request_approved notifications:\n');
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, message, created_at')
    .eq('type', 'return_request_approved')
    .order('created_at', { ascending: false });

  if (notifications && notifications.length > 0) {
    notifications.forEach((notif, i) => {
      console.log(`${i + 1}. ${notif.message.substring(0, 100)}...`);
      const timeMatch = notif.message.match(/pukul (\d{2}:\d{2})/);
      if (timeMatch) {
        const time = timeMatch[1];
        console.log(`   Time: ${time} ${time.endsWith('59') ? '✅' : '❌'}`);
      }
      console.log('');
    });
  } else {
    console.log('No return_request_approved notifications found.\n');
  }
}

cleanupWrongNotifications().catch(console.error);
