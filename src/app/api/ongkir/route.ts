import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ekspedisi = searchParams.get('ekspedisi')
    
    if (!ekspedisi) {
      return NextResponse.json({ 
        error: 'Parameter ekspedisi required' 
      }, { status: 400 })
    }
    
    console.log('Getting ongkir for ekspedisi:', ekspedisi)
    
    const { data, error } = await supabaseAdmin
      .from('ongkir')
      .select('*')
      .ilike('ekspedisi', ekspedisi)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      console.error('Error getting ongkir:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message,
        data: null
      })
    }
    
    console.log('Found ongkir data:', data)
    
    return NextResponse.json({
      success: true,
      data: data
    })
    
  } catch (err: any) {
    console.error('Ongkir API error:', err)
    return NextResponse.json({ 
      error: err.message
    }, { status: 500 })
  }
}