// Install the fixed auto-complete function to prevent race condition
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase service role key');
  console.error('Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function installFix() {
  console.log('🔧 Installing Auto-Complete Race Condition Fix...\n');

  // Read the SQL file
  const sqlFile = path.join(__dirname, 'FIX_AUTO_COMPLETE_RACE_CONDITION.sql');

  if (!fs.existsSync(sqlFile)) {
    console.error('❌ SQL file not found:', sqlFile);
    process.exit(1);
  }

  console.log('📄 SQL file found:', sqlFile);
  console.log('');

  // Note: We need to run this via Supabase Dashboard or psql
  console.log('⚠️  IMPORTANT: Run this SQL in Supabase Dashboard\n');
  console.log('Steps:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Open file: FIX_AUTO_COMPLETE_RACE_CONDITION.sql');
  console.log('4. Copy and paste the entire contents');
  console.log('5. Click "Run"\n');

  console.log('OR use psql:');
  console.log(`   psql $DATABASE_URL -f "${sqlFile}"\n`);

  // Verify current state - check if there are orders that would be affected
  console.log('📊 Checking current database state...\n');

  // Check delivered orders that are due for auto-complete
  const { data: deliveredOrders, error: ordersError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        o.id,
        o.status,
        o.delivered_at,
        EXTRACT(EPOCH FROM (NOW() - o.delivered_at)) / 86400 as days_since_delivered,
        (
          SELECT COUNT(*)
          FROM returns r
          WHERE r.order_id = o.id
          AND r.status IN ('pending', 'approved')
        ) as active_returns_count
      FROM orders o
      WHERE
        o.status = 'delivered'
        AND o.delivered_at IS NOT NULL
        AND o.delivered_at <= NOW() - INTERVAL '2 days'
      ORDER BY o.delivered_at
      LIMIT 10;
    `
  });

  if (ordersError) {
    console.log('⚠️  Cannot query orders directly via RPC, checking via standard query...\n');

    // Alternative query
    const { data: orders, error: err } = await supabase
      .from('orders')
      .select('id, status, delivered_at')
      .eq('status', 'delivered')
      .not('delivered_at', 'is', null)
      .order('delivered_at', { ascending: true })
      .limit(10);

    if (err) {
      console.error('❌ Error querying orders:', err);
    } else if (orders && orders.length > 0) {
      console.log(`Found ${orders.length} delivered order(s) that are due for auto-complete:\n`);

      for (const order of orders) {
        const deliveredAt = new Date(order.delivered_at);
        const now = new Date();
        const daysSince = Math.floor((now - deliveredAt) / (1000 * 60 * 60 * 24));

        // Check if this order has active returns
        const { data: returns, error: retError } = await supabase
          .from('returns')
          .select('id, status')
          .eq('order_id', order.id)
          .in('status', ['pending', 'approved']);

        const hasActiveReturn = returns && returns.length > 0;

        console.log(`Order: ${order.id.substring(0, 10)}...`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Days since delivered: ${daysSince}`);
        console.log(`  Active returns: ${hasActiveReturn ? '✅ YES - Will be SKIPPED' : '❌ NO - Will be COMPLETED'}`);
        if (hasActiveReturn) {
          console.log(`  Return status: ${returns.map(r => r.status).join(', ')}`);
        }
        console.log('');
      }
    } else {
      console.log('✅ No delivered orders found that are due for auto-complete\n');
    }
  }

  console.log('─────────────────────────────────────────────');
  console.log('📝 Summary:\n');
  console.log('The fix will:');
  console.log('1. ✅ Prevent auto-complete for orders with pending/approved returns');
  console.log('2. ✅ Add database trigger to block manual completion');
  console.log('3. ✅ Log which orders are skipped due to active returns');
  console.log('4. ✅ Allow auto-complete for orders with NO active returns\n');

  console.log('After installation:');
  console.log('- Orders with return pending → Auto-complete PAUSED');
  console.log('- Orders with return approved → Auto-complete PAUSED');
  console.log('- Orders with return expired → Auto-complete RUNS normally');
  console.log('- Orders with NO return → Auto-complete RUNS normally\n');

  console.log('🎯 Next step: Run the SQL file in Supabase Dashboard!');
}

installFix().catch(console.error);
