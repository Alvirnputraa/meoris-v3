import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('=== Supabase Admin Client Initialization ===')
console.log('URL present:', !!supabaseUrl)
console.log('Service Role Key present:', !!supabaseServiceRoleKey)
console.log('Service Role Key length:', supabaseServiceRoleKey?.length || 0)
console.log('Service Role Key prefix:', supabaseServiceRoleKey?.substring(0, 20) + '...')

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase URL or Service Role Key for admin operations')
}

// This client uses SERVICE_ROLE_KEY to bypass RLS
// Only use this in server-side API routes, never in client components!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('Supabase Admin client created successfully')
