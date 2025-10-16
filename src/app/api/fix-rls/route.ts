import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST() {
  try {
    console.log('=== FIXING ONGKIR RLS POLICIES ===')
    
    const queries = [
      // 1. Enable RLS
      'ALTER TABLE ongkir ENABLE ROW LEVEL SECURITY;',
      
      // 2. Drop existing policies
      'DROP POLICY IF EXISTS "Allow all users to read ongkir" ON ongkir;',
      'DROP POLICY IF EXISTS "Allow authenticated read ongkir" ON ongkir;', 
      'DROP POLICY IF EXISTS "Allow anonymous read ongkir" ON ongkir;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON ongkir;',
      
      // 3. Create new read policy for all users
      `CREATE POLICY "Allow all users to read ongkir data" 
       ON ongkir 
       FOR SELECT 
       TO authenticated, anon
       USING (true);`,
       
      // 4. Allow authenticated users to modify (for admin)
      `CREATE POLICY "Allow authenticated users to insert ongkir" 
       ON ongkir 
       FOR INSERT 
       TO authenticated
       WITH CHECK (true);`,
       
      `CREATE POLICY "Allow authenticated users to update ongkir" 
       ON ongkir 
       FOR UPDATE 
       TO authenticated
       USING (true) 
       WITH CHECK (true);`
    ]
    
    const results = []
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i]
      console.log(`Executing query ${i + 1}:`, query.substring(0, 50) + '...')
      
      try {
        const { data, error } = await supabaseAdmin.rpc('execute_sql', {
          query: query
        })
        
        if (error) {
          console.log(`Query ${i + 1} error (might be expected):`, error.message)
        }
        
        results.push({
          query: query.substring(0, 100) + '...',
          success: !error,
          error: error?.message || null
        })
      } catch (err: any) {
        // Try alternative approach with direct query
        const { error } = await supabaseAdmin.from('ongkir').select('count', { count: 'exact', head: true })
        
        results.push({
          query: query.substring(0, 100) + '...',
          success: false,
          error: `RPC not available, tried direct query: ${err.message}`
        })
      }
    }
    
    // Test if policies are working by querying from regular client
    console.log('Testing policies with regular client...')
    const { supabase } = await import('@/lib/supabase')
    
    const { data: testData, error: testError } = await supabase
      .from('ongkir')
      .select('*')
      .limit(1)
    
    console.log('Test query result:', { testData, testError })
    
    return NextResponse.json({
      success: true,
      message: 'RLS policies setup completed',
      results,
      testQuery: {
        success: !testError,
        data: testData,
        error: testError?.message
      }
    })
    
  } catch (err: any) {
    console.error('RLS fix error:', err)
    return NextResponse.json({ 
      error: err.message,
      stack: err.stack
    }, { status: 500 })
  }
}