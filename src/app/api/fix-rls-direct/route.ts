import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST() {
  try {
    console.log('=== FIXING ONGKIR RLS WITH DIRECT SQL ===')
    
    // Try to create the policy using direct SQL execution
    const createPolicySQL = `
      -- Enable RLS
      ALTER TABLE public.ongkir ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies
      DROP POLICY IF EXISTS "ongkir_select_policy" ON public.ongkir;
      
      -- Create new select policy for all users
      CREATE POLICY "ongkir_select_policy" 
      ON public.ongkir 
      FOR SELECT 
      USING (true);
    `
    
    console.log('Executing SQL:', createPolicySQL)
    
    // Try using the sql template literal method
    const admin = supabaseAdmin as unknown as { sql?: (strings: TemplateStringsArray, ...values: any[]) => Promise<{ data: any; error: any }> }
    const sqlRunner = admin?.sql
    if (!sqlRunner) {
      throw new Error('Supabase client does not expose sql() helper in this environment')
    }

    const { data, error } = await sqlRunner`
      ALTER TABLE public.ongkir ENABLE ROW LEVEL SECURITY;
    `
    
    if (error) {
      console.error('SQL execution error:', error)
    }
    
    const { data: policyData, error: policyError } = await sqlRunner`
      CREATE POLICY "ongkir_select_policy" 
      ON public.ongkir 
      FOR SELECT 
      USING (true);
    `
    
    if (policyError) {
      console.log('Policy creation result:', policyError.message)
    }
    
    // Test the policy
    console.log('Testing policy with regular client...')
    const { supabase } = await import('@/lib/supabase')
    
    const { data: testData, error: testError } = await supabase
      .from('ongkir')
      .select('*')
      .limit(2)
    
    console.log('Test query result:', { testData, testError })
    
    return NextResponse.json({
      success: true,
      message: 'RLS policy created using direct SQL',
      sqlError: error?.message,
      policyError: policyError?.message,
      testQuery: {
        success: !testError,
        data: testData,
        error: testError?.message,
        dataCount: testData?.length || 0
      }
    })
    
  } catch (err: any) {
    console.error('Direct RLS fix error:', err)
    return NextResponse.json({ 
      error: err.message,
      stack: err.stack
    }, { status: 500 })
  }
}
