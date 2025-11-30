import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service_role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * GET /api/vouchers/used
 * Returns list of used voucher codes for authenticated user
 *
 * Query params:
 * - user_id: UUID of the user
 *
 * Response:
 * - voucher_codes: string[] - Array of used voucher codes
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Validate userId format (basic UUID check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid user_id format' },
        { status: 400 }
      )
    }

    console.log('[API] Fetching used vouchers for user:', userId)

    // Query used_vouchers table using service_role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('used_vouchers')
      .select('voucher_code')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API] Error fetching used vouchers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch used vouchers', details: error.message },
        { status: 500 }
      )
    }

    const voucherCodes = (data || []).map((v: any) => v.voucher_code)

    console.log('[API] Found', voucherCodes.length, 'used voucher(s):', voucherCodes)

    return NextResponse.json({
      voucher_codes: voucherCodes,
      count: voucherCodes.length
    })

  } catch (error: any) {
    console.error('[API] Exception in /api/vouchers/used:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
