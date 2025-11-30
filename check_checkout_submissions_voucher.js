// Check if checkout_submissions has voucher_code column and data
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'exists' : 'missing')
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'exists' : 'missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkCheckoutSubmissions() {
  console.log('=== Checking checkout_submissions for voucher data ===\n')

  // Get recent submissions
  const { data, error } = await supabase
    .from('checkout_submissions')
    .select('id, status, voucher_code, order_summary, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('voucher_code')) {
      console.log('\n🔧 Column voucher_code does not exist!')
      console.log('   Please run: alter_checkout_submissions_add_voucher_cols.sql\n')
    }
    return
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No checkout_submissions found')
    return
  }

  console.log(`Found ${data.length} recent checkout_submissions:\n`)

  data.forEach((sub, index) => {
    console.log(`${index + 1}. Submission ID: ${sub.id.substring(0, 8)}...`)
    console.log(`   Status: ${sub.status}`)
    console.log(`   Created: ${sub.created_at}`)
    console.log(`   Voucher Code (direct): ${sub.voucher_code || 'null'}`)

    if (sub.order_summary) {
      console.log(`   Order Summary:`, JSON.stringify(sub.order_summary, null, 2))
    } else {
      console.log(`   Order Summary: null`)
    }
    console.log('')
  })

  console.log('=== Analysis ===')
  const withDirectVoucher = data.filter(s => s.voucher_code).length
  const withOrderSummaryVoucher = data.filter(s => s.order_summary && s.order_summary.voucher_code).length

  console.log(`Submissions with direct voucher_code: ${withDirectVoucher}`)
  console.log(`Submissions with voucher in order_summary: ${withOrderSummaryVoucher}`)

  if (withDirectVoucher === 0 && withOrderSummaryVoucher > 0) {
    console.log('\n⚠️  Voucher codes are in order_summary but not in voucher_code column')
    console.log('   This is expected if the column was just added')
    console.log('   New checkouts will populate voucher_code column correctly')
  }
}

checkCheckoutSubmissions().catch(console.error)
