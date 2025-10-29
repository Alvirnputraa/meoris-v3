const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createTestUser() {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{ 
        email: 'testuser@example.com', 
        password: 'password123', 
        nama: 'Test User' 
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // unique violation
        console.log('Test user already exists')
      } else {
        console.error('Error creating test user:', error)
      }
    } else {
      console.log('Test user created successfully:', data)
    }
  } catch (err) {
    console.error('Script error:', err)
  }
}

createTestUser()