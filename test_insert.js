const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testInsert() {
  try {
    const code_hash = 'test_hash_12345'
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('email_verifications')
      .insert({
        email: 'testuser@example.com',
        purpose: 'password_reset',
        code_hash: code_hash,
        expires_at: expires_at,
        max_attempts: 5,
        ip: '127.0.0.1',
        user_agent: 'test-script',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Insert error:', error)
    } else {
      console.log('Insert successful:', data)
    }
  } catch (err) {
    console.error('Script error:', err)
  }
}

testInsert()