import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const returnId = searchParams.get('returnId');
    const adminId = searchParams.get('adminId');

    // Validate inputs
    if (!returnId || !adminId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify admin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', adminId)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get return data with all related info
    const { data: returnData, error: fetchError } = await supabaseAdmin
      .from('returns')
      .select(`
        *,
        orders:order_id (
          id,
          order_number,
          total_amount,
          user_id,
          order_items (
            id,
            quantity,
            size,
            price,
            produk:produk_id (
              id,
              nama_produk,
              photo1
            )
          )
        ),
        users:user_id (
          id,
          nama,
          email,
          phone
        )
      `)
      .eq('id', returnId)
      .single();

    if (fetchError || !returnData) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    // Get user's default address
    const { data: userAddresses } = await supabaseAdmin
      .from('user_addresses')
      .select('*')
      .eq('user_id', returnData.user_id)
      .order('is_default', { ascending: false })
      .limit(1);

    const defaultAddress = userAddresses?.[0] || null;

    // Get replacement items if any
    const { data: replacementItems } = await supabaseAdmin
      .from('replacement_items')
      .select('*')
      .eq('return_id', returnId);

    // Get return shipping history
    const { data: returnShippingHistory } = await supabaseAdmin
      .from('return_shipping_history')
      .select('*')
      .eq('return_id', returnId)
      .order('updated_at', { ascending: false });

    // Get replacement shipping history
    const { data: replacementShippingHistory } = await supabaseAdmin
      .from('return_replacement_history')
      .select('*')
      .eq('return_id', returnId)
      .order('updated_at', { ascending: false });

    // Format response
    const response = {
      success: true,
      return: {
        id: returnData.id,
        orderId: returnData.orders?.order_number || returnData.order_number,
        orderIdFull: returnData.order_id,
        customer: returnData.users?.nama || 'Unknown',
        customerEmail: returnData.users?.email || '',
        customerPhone: returnData.users?.phone || '',
        userId: returnData.user_id,
        reason: returnData.reason,
        description: returnData.description,
        videoLink: returnData.video_paths,
        photoPaths: returnData.photo_paths,
        amount: returnData.orders?.total_amount || 0,
        status: returnData.status,
        validasi: returnData.validasi,
        statusValidasi: returnData.status_validasi,
        validationNotes: returnData.validation_notes,
        date: returnData.created_at,
        approvedAt: returnData.approved_at,
        validationCompletedAt: returnData.validation_completed_at,
        returnWaybill: returnData.return_waybill,
        returnCourier: returnData.return_courier,
        replacementWaybill: returnData.replacement_waybill,
        replacementCourier: returnData.replacement_courier,
        replacementShippedAt: returnData.replacement_shipped_at,
        shippingArranged: returnData.shipping_arranged,
        orderItems: returnData.orders?.order_items || [],
      },
      customerAddress: defaultAddress ? {
        nama: defaultAddress.nama,
        phone: defaultAddress.phone,
        street: defaultAddress.street,
        kelurahan: defaultAddress.kelurahan,
        kecamatan: defaultAddress.kecamatan,
        kabupaten: defaultAddress.kabupaten,
        provinsi: defaultAddress.provinsi,
        postal: defaultAddress.postal,
        fullAddress: `${defaultAddress.street}, ${defaultAddress.kelurahan}, ${defaultAddress.kecamatan}, ${defaultAddress.kabupaten}, ${defaultAddress.provinsi}, ${defaultAddress.postal}`
      } : null,
      replacementItems: replacementItems || [],
      returnShippingHistory: returnShippingHistory || [],
      replacementShippingHistory: replacementShippingHistory || []
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in get return detail API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
