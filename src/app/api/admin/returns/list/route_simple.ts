import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get('adminId');
    const status = searchParams.get('status'); // Filter by status

    console.log('[Admin Returns List] adminId:', adminId, 'status:', status);

    // For now, skip admin validation to debug
    // if (!adminId) {
    //   return NextResponse.json({ error: 'Admin ID required' }, { status: 400 });
    // }

    // Build query
    let query = supabase
      .from('returns')
      .select(`
        *,
        orders:order_id (
          id,
          order_number,
          total_amount,
          user_id
        ),
        users:user_id (
          nama,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: returns, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Admin Returns List] Error fetching returns:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 });
    }

    console.log('[Admin Returns List] Found', returns?.length || 0, 'returns');

    // Format response
    const formattedReturns = returns?.map((ret: any) => ({
      id: ret.id,
      returnId: ret.id,
      orderId: ret.orders?.order_number || ret.order_number,
      orderIdFull: ret.order_id,
      customer: ret.users?.nama || 'Unknown',
      customerEmail: ret.users?.email || '',
      userId: ret.user_id,
      reason: ret.reason,
      description: ret.description,
      amount: ret.orders?.total_amount ? `Rp ${ret.orders.total_amount.toLocaleString('id-ID')}` : 'Rp 0',
      status: ret.status,
      validasi: ret.validasi,
      statusValidasi: ret.status_validasi,
      date: ret.created_at,
      approvedAt: ret.approved_at,
      validationCompletedAt: ret.validation_completed_at,
      validationNotes: ret.validation_notes,
      returnWaybill: ret.return_waybill,
      returnCourier: ret.return_courier,
      replacementWaybill: ret.replacement_waybill,
      replacementCourier: ret.replacement_courier,
      replacementShippedAt: ret.replacement_shipped_at,
      shippingArranged: ret.shipping_arranged,
      photoPaths: ret.photo_paths,
      videoPaths: ret.video_paths,
    })) || [];

    return NextResponse.json({
      success: true,
      returns: formattedReturns
    });
  } catch (error: any) {
    console.error('[Admin Returns List] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
