import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client using Service Role key
// IMPORTANT: never expose SERVICE_ROLE_KEY to the client

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

