// Check returns table and trigger status
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReturnsAndTrigger() {
  console.log('🔍 Checking returns and trigger status...\n');

  // 1. Check all returns
  console.log('📋 Checking returns table:');
  const { data: returns, error: returnsError } = await supabase
    .from('returns')
    .select('id, order_id, status, approved_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (returnsError) {
    console.error('❌ Error fetching returns:', returnsError);
  } else if (!returns || returns.length === 0) {
    console.log('⚠️  No returns found in database\n');
  } else {
    console.log(`\nFound ${returns.length} return(s):\n`);
    returns.forEach((ret, i) => {
      console.log(`${i + 1}. Return ID: ${ret.id}`);
      console.log(`   Order: ${ret.order_id}`);
      console.log(`   Status: ${ret.status}`);
      console.log(`   Approved at: ${ret.approved_at || 'Not approved'}`);
      console.log(`   Created: ${ret.created_at}`);
      console.log('');
    });

    // Count by status
    const approved = returns.filter(r => r.status === 'approved').length;
    const pending = returns.filter(r => r.status === 'pending').length;
    console.log(`Status Summary:`);
    console.log(`  Pending: ${pending}`);
    console.log(`  Approved: ${approved}\n`);

    if (approved > 0) {
      console.log(`✅ Found ${approved} approved return(s)`);
      console.log('   But notifications table is empty!');
      console.log('   This means the trigger is either:');
      console.log('   1. Not created yet');
      console.log('   2. Not working correctly');
      console.log('   3. Using wrong time format\n');
    }
  }

  // 2. Check notifications for comparison
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, message, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`📬 Notifications table: ${notifications?.length || 0} total notifications\n`);

  if (approved > 0 && (!notifications || notifications.length === 0)) {
    console.log('💡 PROBLEM IDENTIFIED:');
    console.log('   You have approved returns but NO notifications');
    console.log('   \n   SOLUTION:');
    console.log('   1. Run the SQL file: create_notification_on_return_approved.sql');
    console.log('   2. This will create the trigger');
    console.log('   3. Then test by approving a new return (or update an existing one)\n');
  }
}

checkReturnsAndTrigger().catch(console.error);
