import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { returnId, adminId, courier } = body;

    // Validate input
    if (!returnId || !adminId || !courier) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['sicepat', 'jnt', 'jne'].includes(courier)) {
      return NextResponse.json({ error: 'Invalid courier. Must be sicepat, jnt, or jne' }, { status: 400 });
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

    // Get return data with order and replacement items
    const { data: returnData, error: fetchError } = await supabaseAdmin
      .from('returns')
      .select(`
        *,
        orders:order_id (
          id,
          order_number,
          user_id
        )
      `)
      .eq('id', returnId)
      .single();

    if (fetchError || !returnData) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    // Check if validation passed
    if (returnData.validasi !== 'approved') {
      return NextResponse.json({ error: 'Return validation must be approved first' }, { status: 400 });
    }

    // Check if already shipped
    if (returnData.replacement_waybill) {
      return NextResponse.json({ error: 'Replacement already shipped' }, { status: 400 });
    }

    // Get replacement items
    const { data: replacementItems, error: itemsError } = await supabaseAdmin
      .from('replacement_items')
      .select('*')
      .eq('return_id', returnId);

    if (itemsError || !replacementItems || replacementItems.length === 0) {
      return NextResponse.json({ error: 'No replacement items found. Please add items first.' }, { status: 400 });
    }

    // Get user's default address
    const { data: userAddresses } = await supabaseAdmin
      .from('user_addresses')
      .select('*')
      .eq('user_id', returnData.orders.user_id)
      .order('is_default', { ascending: false })
      .limit(1);

    const defaultAddress = userAddresses?.[0];

    if (!defaultAddress) {
      return NextResponse.json({ error: 'User address not found' }, { status: 400 });
    }

    // Fallback to users table for phone if needed
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('nama, phone')
      .eq('id', returnData.orders.user_id)
      .single();

    // Generate waybill via Biteship
    const waybillResult = await generateReplacementWaybill(
      returnData,
      replacementItems,
      defaultAddress,
      userData,
      courier
    );

    if (!waybillResult.success) {
      return NextResponse.json({ error: waybillResult.error || 'Failed to generate waybill' }, { status: 500 });
    }

    // Update return record with replacement shipping info
    const courierDisplayName = courier === 'jnt' ? 'J&T Express' : courier === 'jne' ? 'JNE' : 'SiCepat';

    const { error: updateError } = await supabaseAdmin
      .from('returns')
      .update({
        replacement_courier: courier,
        replacement_courier_service: waybillResult.service,
        replacement_waybill: waybillResult.waybill,
        replacement_shipped_at: new Date().toISOString(),
        status: 'replacement_shipped', // New status
        updated_at: new Date().toISOString()
      })
      .eq('id', returnId);

    if (updateError) {
      console.error('Error updating return:', updateError);
      return NextResponse.json({ error: 'Failed to update return' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Replacement shipped successfully',
      waybill: waybillResult.waybill,
      courier: courierDisplayName
    });
  } catch (error: any) {
    console.error('Error in ship replacement API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate replacement waybill via Biteship
async function generateReplacementWaybill(
  returnData: any,
  replacementItems: any[],
  customerAddress: any,
  userData: any,
  courier: string
) {
  try {
    const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY;
    if (!BITESHIP_API_KEY) {
      throw new Error('Biteship API key not configured');
    }

    // Store address (origin for replacement shipment)
    const storeAddress = {
      name: 'Meoris Store',
      phone: '6289695971729',
      address: 'Sambong mangkubumi Rt 001/Rw 002',
      city: 'Kota Tasikmalaya',
      province: 'Jawa Barat',
      postal_code: '46181',
    };

    // Customer data (destination for replacement shipment)
    const customerName = customerAddress.nama || userData?.nama || 'Customer';
    let customerPhone = customerAddress.phone || userData?.phone || '';

    // Clean phone number
    let cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }

    // Validate phone
    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        error: 'Nomor telepon customer tidak valid'
      };
    }

    // Construct customer full address
    const addressParts = [
      customerAddress.street,
      customerAddress.kelurahan,
      customerAddress.kecamatan,
      customerAddress.kabupaten,
      customerAddress.provinsi
    ].filter(Boolean);
    const customerFullAddress = addressParts.join(', ');

    // Map courier to Biteship codes
    let courierCompany = 'sicepat';
    let courierType = 'reg';

    if (courier === 'sicepat') {
      courierCompany = 'sicepat';
      courierType = 'reg';
    } else if (courier === 'jnt') {
      courierCompany = 'jnt';
      courierType = 'ez';
    } else if (courier === 'jne') {
      courierCompany = 'jne';
      courierType = 'reg';
    }

    // Calculate total weight (estimate 1kg per item)
    const totalWeight = replacementItems.reduce((sum, item) => sum + (item.quantity * 1000), 0);

    // Prepare Biteship order payload
    const orderPayload: any = {
      origin_contact_name: storeAddress.name,
      origin_contact_phone: storeAddress.phone,
      origin_address: storeAddress.address,
      origin_postal_code: parseInt(storeAddress.postal_code),
      destination_contact_name: customerName,
      destination_contact_phone: cleanPhone,
      destination_address: customerFullAddress,
      destination_postal_code: parseInt(customerAddress.postal) || 46181,
      courier_company: courierCompany,
      courier_type: courierType,
      delivery_type: 'now',
      order_note: `Replacement shipment for return ${returnData.order_number || returnData.id}`,
      items: replacementItems.map((item) => ({
        name: item.product_name,
        description: `Size: ${item.product_size}`,
        value: 200000, // Dummy value
        weight: 1000, // 1kg per item
        quantity: item.quantity,
      })),
    };

    console.log('[Ship Replacement] Biteship payload:', JSON.stringify(orderPayload, null, 2));

    // Call Biteship API
    const biteshipResponse = await fetch('https://api.biteship.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': BITESHIP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    const biteshipData = await biteshipResponse.json();

    console.log('[Ship Replacement] Biteship response:', JSON.stringify(biteshipData, null, 2));

    if (!biteshipResponse.ok || !biteshipData.success) {
      console.error('Biteship API error:', biteshipData);
      return {
        success: false,
        error: biteshipData.error || biteshipData.message || 'Failed to create shipping order',
      };
    }

    // Extract waybill
    const waybill = biteshipData.courier?.waybill_id
      || biteshipData.order?.waybill_id
      || biteshipData.data?.courier?.waybill_id
      || biteshipData.data?.order?.waybill_id
      || biteshipData.waybill_id
      || '';

    const defaultServiceName = courier === 'sicepat' ? 'SiCepat Regular' : courier === 'jne' ? 'JNE Regular' : 'J&T Express Easy';
    const service = biteshipData.courier?.name || biteshipData.data?.courier?.name || defaultServiceName;

    console.log('[Ship Replacement] Waybill generated:', waybill);

    if (!waybill) {
      console.error('[Ship Replacement] Warning: No waybill found in response');
    }

    return {
      success: true,
      waybill,
      service,
    };
  } catch (error: any) {
    console.error('Error generating replacement waybill:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate waybill',
    };
  }
}
