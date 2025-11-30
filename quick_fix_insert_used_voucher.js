// Quick fix: Insert used voucher manually for testing
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing credentials in .env.local')
  console.log('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function quickFix() {
  console.log('=== Quick Fix: Insert Used Voucher ===\n')

  // Get most recent PAID order
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*, checkout_submissions!checkout_submissions_id_fkey(*)')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(5)

  if (ordersError || !orders || orders.length === 0) {
    console.log('No PAID orders found')
    process.exit(1)
  }

  console.log('Recent PAID orders:\n')
  orders.forEach((order, i) => {
    const submission = Array.isArray(order.checkout_submissions)
      ? order.checkout_submissions[0]
      : order.checkout_submissions

    const voucherCode = order.voucher_code ||
                       (submission?.voucher_code) ||
                       (submission?.order_summary?.voucher_code) ||
                       'NO VOUCHER'

    console.log(`${i + 1}. Order: ${order.id.substring(0, 8)}...`)
    console.log(`   User: ${order.user_id.substring(0, 8)}...`)
    console.log(`   Voucher: ${voucherCode}`)
    console.log(`   Total: Rp ${order.total_amount}`)
    console.log(`   Date: ${order.created_at}`)
    console.log('')
  })

  rl.question('Select order number to mark voucher as used (1-5, or 0 to exit): ', async (answer) => {
    const num = parseInt(answer)

    if (num === 0 || num < 1 || num > orders.length) {
      console.log('Cancelled')
      rl.close()
      process.exit(0)
    }

    const selectedOrder = orders[num - 1]
    const submission = Array.isArray(selectedOrder.checkout_submissions)
      ? selectedOrder.checkout_submissions[0]
      : selectedOrder.checkout_submissions

    const voucherCode = selectedOrder.voucher_code ||
                       (submission?.voucher_code) ||
                       (submission?.order_summary?.voucher_code) ||
                       null

    if (!voucherCode) {
      console.log('❌ This order has no voucher code')
      rl.close()
      process.exit(1)
    }

    console.log(`\nInserting used voucher:`)
    console.log(`  User: ${selectedOrder.user_id}`)
    console.log(`  Voucher: ${voucherCode}`)
    console.log(`  Order: ${selectedOrder.id}`)

    const { data, error } = await supabase
      .from('used_vouchers')
      .insert({
        user_id: selectedOrder.user_id,
        voucher_code: voucherCode,
        order_id: selectedOrder.id,
        used_at: selectedOrder.created_at
      })
      .select()

    if (error) {
      if (error.code === '23505') {
        console.log('⚠️  Voucher already marked as used (duplicate)')
      } else {
        console.error('❌ Error:', error.message)
        console.error('   Code:', error.code)
        console.error('   Details:', error.details)
      }
    } else {
      console.log('✅ Success! Voucher marked as used')
      console.log('   Result:', data)
    }

    rl.close()
    process.exit(0)
  })
}

quickFix().catch(console.error)
