const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTable() {
  try {
    const { data, error } = await supabase
      .from('email_verifications')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Table does not exist or error:', error)
    } else {
      console.log('Table exists, sample data:', data)
    }
  } catch (err) {
    console.error('Script error:', err)
  }
}

checkTable()