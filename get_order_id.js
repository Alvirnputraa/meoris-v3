/**
 * Script untuk mengambil Order ID dari database
 * Run: node get_order_id.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vtwooclhjobgdgvljauq.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0d29vY2xoam9iZ2RndmxqYXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQyNDM1MiwiZXhwIjoyMDc0MDAwMzUyfQ.DhQmZWCjZVzIcmMcwIpLlKaS1VYx2AJYP1ad3QNRIeU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getOrderIds() {
  console.log('📦 Fetching orders from database...\n')

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, shipping_status, shipping_resi, total_amount, created_at')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Error fetching orders:', error.message)
    return
  }

  if (!orders || orders.length === 0) {
    console.log('⚠️  No paid orders found in database')
    console.log('\nTo test webhook, you need to:')
    console.log('1. Create a test order through the website')
    console.log('2. Complete payment (use Tripay sandbox)')
    console.log('3. Run this script again to get the order ID')
    return
  }

  console.log(`✅ Found ${orders.length} paid order(s):\n`)

  orders.forEach((order, index) => {
    console.log(`${index + 1}. Order ID: ${order.id}`)
    console.log(`   Status: ${order.status}`)
    console.log(`   Shipping Status: ${order.shipping_status || 'Not set'}`)
    console.log(`   Resi: ${order.shipping_resi || 'Not set'}`)
    console.log(`   Total: Rp ${Number(order.total_amount || 0).toLocaleString('id-ID')}`)
    console.log(`   Created: ${new Date(order.created_at).toLocaleString('id-ID')}`)
    console.log('')
  })

  console.log('=' .repeat(60))
  console.log('📋 To test webhook, copy one of the Order IDs above')
  console.log('=' .repeat(60))
  console.log('\nNext steps:')
  console.log('1. Open test_webhook.js')
  console.log(`2. Replace 'YOUR-ORDER-UUID-HERE' with: ${orders[0].id}`)
  console.log('3. Run: node test_webhook.js')
}

getOrderIds().catch(console.error)
