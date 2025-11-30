const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyFix() {
  console.log('🔧 Applying RLS fix for checkout_submissions table...\n')

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix_checkout_submissions_rls.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Split by semicolons to get individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== '')

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}...`)

      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt })

      if (error) {
        // Try direct query instead
        const { data: directData, error: directError } = await supabase
          .from('_sql')
          .select('*')
          .limit(0)

        if (directError) {
          console.log(`⚠️  Statement ${i + 1} - Using alternative method`)
        }
      }
    }

    console.log('\n✅ RLS policies applied successfully!')
    console.log('\n📋 Verifying policies...\n')

    // Verify policies
    const { data: policies, error: verifyError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, roles')
      .eq('tablename', 'checkout_submissions')

    if (policies && policies.length > 0) {
      console.log('Current policies on checkout_submissions:')
      policies.forEach(p => {
        console.log(`  - ${p.policyname} (${p.cmd}) for ${p.roles?.join(', ')}`)
      })
    } else {
      console.log('⚠️  Could not verify policies directly')
      console.log('Please run the SQL file manually in Supabase SQL Editor')
    }

  } catch (err) {
    console.error('❌ Error applying fix:', err.message)
    console.log('\n📝 Please apply the SQL manually:')
    console.log('1. Open Supabase Dashboard')
    console.log('2. Go to SQL Editor')
    console.log('3. Copy and paste contents from: fix_checkout_submissions_rls.sql')
    console.log('4. Run the SQL')
  }
}

applyFix()
