// Run this with: node --no-warnings --loader ts-node/esm check_order_address.ts
// Or compile first: npx tsx check_order_address.ts

const orderNumber = 'DEV-T444563065427YKK8'

async function checkOrder() {
  try {
    // Use fetch to call Supabase REST API directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
      console.log('You can run: npm run dev and check the order in browser console')
      return
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?order_number=eq.${orderNumber}&select=id,order_number,shipping_address_json,checkout_submission_id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    )

    const orders = await response.json()
    const order = orders[0]

    if (!order) {
      console.log('Order not found')
      return
    }

    console.log('\n=== ORDER DATA ===')
    console.log('Order ID:', order.id)
    console.log('Order Number:', order.order_number)
    console.log('\nShipping Address JSON:')
    console.log(JSON.stringify(order.shipping_address_json, null, 2))

    // Check checkout submission
    if (order.checkout_submission_id) {
      const subResponse = await fetch(
        `${supabaseUrl}/rest/v1/checkout_submissions?id=eq.${order.checkout_submission_id}&select=shipping_address`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      )

      const submissions = await subResponse.json()
      const submission = submissions[0]

      console.log('\n=== CHECKOUT SUBMISSION SHIPPING ADDRESS ===')
      console.log(JSON.stringify(submission?.shipping_address, null, 2))
    }
  } catch (err) {
    console.error('Error:', err.message)
  }
}

checkOrder()
