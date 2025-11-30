import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get('adminId');
    const status = searchParams.get('status'); // Filter by status

    console.log('[Admin Returns List] Received adminId:', adminId);

    // Validate admin
    if (!adminId) {
      console.error('[Admin Returns List] No adminId provided');
      return NextResponse.json({ error: 'Admin ID required. Please login as admin.' }, { status: 400 });
    }

    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, nama')
      .eq('id', adminId)
      .single();

    console.log('[Admin Returns List] Admin check result:', { adminUser, adminError });

    if (adminError || !adminUser) {
      console.error('[Admin Returns List] Admin validation failed:', adminError?.message);
      return NextResponse.json({
        error: 'Unauthorized. Admin not found or invalid.',
        details: adminError?.message
      }, { status: 401 });
    }

    console.log('[Admin Returns List] Admin verified:', adminUser.email);

    // Build query
    let query = supabaseAdmin
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
      console.error('Error fetching returns:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 });
    }

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
    console.error('Error in list returns API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
