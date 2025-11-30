const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
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

async function addValidationColumns() {
  console.log('=== Adding Validation Columns to Returns Table ===\n')

  // Add status_validasi column
  console.log('1. Adding status_validasi column...')
  const sql1 = `
    ALTER TABLE public.returns
    ADD COLUMN IF NOT EXISTS status_validasi TEXT;
  `

  const result1 = await supabase.rpc('exec', { sql: sql1 })
  const error1 = result1.error

  if (error1) {
    console.error('❌ Error adding status_validasi:', error1.message)
  } else {
    console.log('✅ status_validasi column added')
  }

  // Add validasi column
  console.log('\n2. Adding validasi column...')
  const sql2 = `
    ALTER TABLE public.returns
    ADD COLUMN IF NOT EXISTS validasi TEXT;
  `

  const result2 = await supabase.rpc('exec', { sql: sql2 })
  const error2 = result2.error

  if (error2) {
    console.error('❌ Error adding validasi:', error2.message)
  } else {
    console.log('✅ validasi column added')
  }

  // Verify columns
  console.log('\n3. Verifying columns...')
  const { data: returns, error: verifyError } = await supabase
    .from('returns')
    .select('id, status, status_validasi, validasi')
    .limit(1)

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError.message)
  } else {
    console.log('✅ Columns verified successfully')
    console.log('Sample columns:', Object.keys(returns[0] || {}))
  }

  console.log('\n=== Migration Complete ===')
}

addValidationColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
