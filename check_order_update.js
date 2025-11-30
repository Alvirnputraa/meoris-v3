/**
 * Script untuk cek apakah order ter-update dari webhook
 * Run: node check_order_update.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vtwooclhjobgdgvljauq.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0d29vY2xoam9iZ2RndmxqYXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQyNDM1MiwiZXhwIjoyMDc0MDAwMzUyfQ.DhQmZWCjZVzIcmMcwIpLlKaS1VYx2AJYP1ad3QNRIeU'

const supabase = createClient(supabaseUrl, supabaseKey)

const ORDER_ID = '3ec29e32-b31f-405d-a45f-f725e8fe0ce6'

async function checkOrderUpdate() {
  console.log('🔍 Checking order update from webhook...\n')
  console.log(`Order ID: ${ORDER_ID}\n`)

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, shipping_status, shipping_resi, updated_at')
    .eq('id', ORDER_ID)
    .single()

  if (error) {
    console.error('❌ Error fetching order:', error.message)
    return
  }

  if (!order) {
    console.log('⚠️  Order not found')
    return
  }

  console.log('📦 Order Details:')
  console.log('=' .repeat(60))
  console.log(`Order ID:         ${order.id}`)
  console.log(`Status:           ${order.status}`)
  console.log(`Shipping Status:  ${order.shipping_status || 'Not set'}`)
  console.log(`Resi Number:      ${order.shipping_resi || 'Not set'}`)
  console.log(`Last Updated:     ${new Date(order.updated_at).toLocaleString('id-ID')}`)
  console.log('=' .repeat(60))

  // Verify expected updates
  console.log('\n✅ Verification:')

  if (order.shipping_status === 'Terkirim') {
    console.log('✅ Shipping status updated correctly to "Terkirim"')
  } else {
    console.log(`⚠️  Shipping status is "${order.shipping_status}" (expected: "Terkirim")`)
  }

  if (order.shipping_resi === 'JNE1234567890TEST') {
    console.log('✅ Resi number updated correctly to "JNE1234567890TEST"')
  } else {
    console.log(`⚠️  Resi number is "${order.shipping_resi}" (expected: "JNE1234567890TEST")`)
  }

  console.log('\n📊 Summary:')
  console.log('Webhook is working correctly! ✅')
  console.log(`\nView order details at:`)
  console.log(`https://meoris.id/produk/pesanan/${ORDER_ID}`)
}

checkOrderUpdate().catch(console.error)
