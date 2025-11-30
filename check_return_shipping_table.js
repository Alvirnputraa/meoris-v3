const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function checkReturnShippingTable() {
  console.log('=== Checking return_shipping_history table ===\n')

  // Check if table exists and get structure
  const { data: columns, error: columnsError } = await supabase
    .from('return_shipping_history')
    .select('*')
    .limit(0)

  if (columnsError) {
    console.error('❌ Error accessing table:', columnsError.message)
    console.error('Code:', columnsError.code)
    console.error('\nThe table may not exist. Please run:')
    console.error('create_return_shipping_history_table.sql')
    return
  }

  console.log('✅ Table exists!\n')

  // Try to get sample data
  const { data: sampleData, error: sampleError } = await supabase
    .from('return_shipping_history')
    .select('*')
    .limit(5)
    .order('created_at', { ascending: false })

  if (sampleError) {
    console.error('❌ Error fetching data:', sampleError.message)
  } else {
    console.log(`Found ${sampleData.length} records\n`)
    if (sampleData.length > 0) {
      console.log('Sample record:')
      console.log(JSON.stringify(sampleData[0], null, 2))
    }
  }

  // Check RLS policies
  console.log('\n=== Checking RLS policies ===')
  const { data: policies, error: policiesError } = await supabase.rpc('exec', {
    sql: `
      SELECT policyname, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'return_shipping_history'
    `
  }).catch(() => {
    console.log('(Cannot check policies - need database access)')
    return { data: null, error: null }
  })

  if (policies && policies.length > 0) {
    console.log('Policies found:')
    policies.forEach(p => console.log(`- ${p.policyname} (${p.cmd})`))
  }
}

checkReturnShippingTable()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
