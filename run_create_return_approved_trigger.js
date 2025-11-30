// Run the SQL to create the return approved trigger with :59 time format
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure you have SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQLFile() {
  console.log('🚀 Creating return approved notification trigger...\n');

  // Read the SQL file
  const sqlFile = path.join(__dirname, 'create_notification_on_return_approved.sql');

  if (!fs.existsSync(sqlFile)) {
    console.error('❌ SQL file not found:', sqlFile);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('📄 Read SQL file:', sqlFile);
  console.log(`📏 File size: ${sql.length} characters\n`);

  // Note: We can't execute raw SQL directly via Supabase client without service role
  // Instead, we'll need to execute this via the Supabase dashboard or psql
  console.log('⚠️  IMPORTANT: You need to run this SQL in Supabase dashboard\n');
  console.log('Steps:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Paste the contents of: create_notification_on_return_approved.sql');
  console.log('4. Click "Run"\n');
  console.log('OR use this command if you have psql installed:');
  console.log(`   psql $DATABASE_URL -f "${sqlFile}"\n`);

  console.log('After creating the trigger, we\'ll need to:');
  console.log('1. Manually create a notification for the existing approved return');
  console.log('2. Or update the return status to trigger the notification\n');

  // Let's create the notification manually for the existing approved return
  console.log('📝 Creating notification manually for existing approved return...\n');

  // Get the approved return
  const { data: returns, error: returnsError } = await supabase
    .from('returns')
    .select('*')
    .eq('status', 'approved')
    .single();

  if (returnsError || !returns) {
    console.error('❌ Error fetching approved return:', returnsError);
    return;
  }

  console.log('Found approved return:');
  console.log('  Order ID:', returns.order_id);
  console.log('  Approved at:', returns.approved_at);
  console.log('  User ID:', returns.user_id);
  console.log('');

  // Calculate deadline with :59 format
  const approvedAt = new Date(returns.approved_at);
  // Add 2 days
  const deadline = new Date(approvedAt.getTime() + (2 * 24 * 60 * 60 * 1000));
  // Round to :59
  deadline.setMinutes(59);
  deadline.setSeconds(59);
  deadline.setMilliseconds(0);

  // Format order ID (10 chars uppercase)
  const orderIdDisplay = returns.order_id.toString().replace(/-/g, '').substring(0, 10).toUpperCase();

  // Format deadline in Indonesian
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const day = deadline.getDate();
  const month = months[deadline.getMonth()];
  const year = deadline.getFullYear();
  const hour = String(deadline.getHours()).padStart(2, '0');
  const minute = String(deadline.getMinutes()).padStart(2, '0');
  const deadlineText = `${day} ${month} ${year} pukul ${hour}:${minute}`;

  const message = `Permintaan pengembalian untuk id pesanan ${orderIdDisplay} telah disetujui. Harap kemas kembali barang dan atur pengiriman sebelum ${deadlineText}`;

  console.log('Creating notification:');
  console.log('  Message:', message);
  console.log('');

  const { data: notif, error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: returns.user_id,
      order_id: returns.order_id,
      type: 'return_request_approved',
      title: 'Permintaan Pengembalian Disetujui',
      message: message
    })
    .select()
    .single();

  if (notifError) {
    console.error('❌ Error creating notification:', notifError);
  } else {
    console.log('✅ Notification created successfully!');
    console.log('  Notification ID:', notif.id);
    console.log('  Time format:', minute === '59' ? '✅ CORRECT (:59)' : `❌ WRONG (:${minute})`);
    console.log('');
    console.log('🎉 You can now check the notification at:');
    console.log('   http://localhost:3000/user/purchase?view=notifications');
  }
}

runSQLFile().catch(console.error);
