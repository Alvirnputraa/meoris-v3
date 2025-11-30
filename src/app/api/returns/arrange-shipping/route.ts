import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { returnId, userId, shippingMethod, scheduledDate, courier } = body;

    // Validate input
    if (!returnId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!shippingMethod || !['dropoff', 'pickup'].includes(shippingMethod)) {
      return NextResponse.json({ error: 'Invalid shipping method. Must be dropoff or pickup' }, { status: 400 });
    }

    // Validate courier (default to sicepat if not provided)
    const selectedCourier = courier || 'sicepat';
    if (!['sicepat', 'jnt'].includes(selectedCourier)) {
      return NextResponse.json({ error: 'Invalid courier. Must be sicepat or jnt' }, { status: 400 });
    }

    // Fetch return data
    const { data: returnData, error: fetchError } = await supabaseAdmin
      .from('returns')
      .select(`
        *,
        orders:order_id (
          id,
          order_number,
          shipping_address,
          user_id
        )
      `)
      .eq('id', returnId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !returnData) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    // Check if already arranged
    if (returnData.shipping_arranged) {
      return NextResponse.json({ error: 'Shipping already arranged' }, { status: 400 });
    }

    // Check if status is approved
    if (returnData.status !== 'approved') {
      return NextResponse.json({ error: 'Return must be approved first' }, { status: 400 });
    }

    // Generate waybill from Biteship
    const waybillResult = await generateReturnWaybill(returnData, shippingMethod, scheduledDate, selectedCourier);

    if (!waybillResult.success) {
      return NextResponse.json({ error: waybillResult.error || 'Failed to generate waybill' }, { status: 500 });
    }

    // Prepare update data - use selected courier
    const courierName = selectedCourier;
    const courierDisplayName = selectedCourier === 'jnt' ? 'J&T Express' : 'SiCepat';

    const updateData: any = {
      return_shipping_method: shippingMethod,
      shipping_arranged: true,
      arranged_at: new Date().toISOString(),
      return_waybill: waybillResult.waybill,
      return_courier: courierName,
      return_courier_service: waybillResult.service,
      updated_at: new Date().toISOString()
    };

    // For pickup, save scheduled timestamp
    updateData.return_shipping_scheduled_at = new Date().toISOString();

    // Update return record
    const { error: updateError } = await supabaseAdmin
      .from('returns')
      .update(updateData)
      .eq('id', returnId);

    if (updateError) {
      console.error('Error updating return:', updateError);
      return NextResponse.json({ error: 'Failed to update return' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Pickup berhasil dijadwalkan',
      waybill: waybillResult.waybill,
      method: 'pickup',
      courier: courierDisplayName
    });
  } catch (error: any) {
    console.error('Error in arrange-shipping API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate return waybill via Biteship
async function generateReturnWaybill(returnData: any, shippingMethod: string, scheduledDate?: string, courier: string = 'sicepat') {
  try {
    const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY;
    if (!BITESHIP_API_KEY) {
      throw new Error('Biteship API key not configured');
    }

    // Store address (destination for return shipment)
    const storeAddress = {
      name: 'Meoris Store',
      phone: '6289695971729',
      address: 'Sambong mangkubumi Rt 001/Rw 002',
      city: 'Kota Tasikmalaya',
      province: 'Jawa Barat',
      postal_code: '46181',
    };

    // Parse customer shipping address (origin for return shipment)
    const customerAddress = returnData.orders?.shipping_address || '';

    console.log('[Arrange Shipping] Raw shipping address:', customerAddress);
    console.log('[Arrange Shipping] Return data user:', returnData.user_id);

    // Try to get user data for fallback
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('nama, phone, shipping_phone, shipping_street, shipping_postal_code')
      .eq('id', returnData.user_id)
      .single();

    console.log('[Arrange Shipping] User data:', userData);

    // Also try to get from user_addresses (prioritize default address)
    const { data: userAddresses } = await supabaseAdmin
      .from('user_addresses')
      .select('*')
      .eq('user_id', returnData.user_id)
      .order('is_default', { ascending: false })
      .limit(1);

    const defaultAddress = userAddresses?.[0];
    console.log('[Arrange Shipping] Default address:', defaultAddress);

    // Extract customer info from shipping address
    // Format bisa berbeda-beda, jadi kita parse dengan hati-hati
    const addressLines = customerAddress.split('\n').filter((line: string) => line.trim());

    let customerName = 'Customer';
    let customerPhone = '';
    let customerStreetAddress = '';
    let customerPostalCode = '46181';

    // Try to extract from shipping_address
    if (addressLines.length >= 3) {
      customerName = addressLines[0]?.trim() || 'Customer';
      customerPhone = addressLines[1]?.trim() || '';
      customerStreetAddress = addressLines[2]?.trim() || '';

      // Try to extract postal code from address line
      const postalMatch = customerAddress.match(/\b\d{5}\b/);
      if (postalMatch) {
        customerPostalCode = postalMatch[0];
      }
    }

    // Fallback to user data if needed - prioritize user_addresses, then users table
    if (!customerName || customerName === 'Customer') {
      customerName = defaultAddress?.nama || userData?.nama || 'Customer';
    }
    if (!customerPhone) {
      // Priority: defaultAddress.phone > userData.shipping_phone > userData.phone
      customerPhone = defaultAddress?.phone || userData?.shipping_phone || userData?.phone || '';
    }
    if (!customerStreetAddress) {
      // Construct full address from user_addresses if available
      if (defaultAddress) {
        const addressParts = [
          defaultAddress.street,
          defaultAddress.kelurahan,
          defaultAddress.kecamatan,
          defaultAddress.kabupaten,
          defaultAddress.provinsi
        ].filter(Boolean);
        customerStreetAddress = addressParts.join(', ') || 'Alamat tidak tersedia';
      } else {
        customerStreetAddress = userData?.shipping_street || 'Alamat tidak tersedia';
      }
    }
    if (!customerPostalCode || customerPostalCode === '46181') {
      customerPostalCode = defaultAddress?.postal || userData?.shipping_postal_code || '46181';
    }

    // Clean phone number (remove non-digits, remove leading 0 or +62)
    let cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('62')) {
      // Already has country code, keep it
    } else {
      // Add country code
      cleanPhone = '62' + cleanPhone;
    }

    console.log('[Arrange Shipping] Parsed data:', {
      customerName,
      originalPhone: customerPhone,
      cleanPhone,
      customerStreetAddress,
      customerPostalCode
    });

    // Validate required fields
    if (!cleanPhone || cleanPhone.length < 10) {
      console.error('[Arrange Shipping] Phone validation failed:', {
        originalPhone: customerPhone,
        cleanPhone,
        length: cleanPhone.length,
        userData: userData,
        defaultAddress: defaultAddress
      });
      return {
        success: false,
        error: 'Nomor telepon tidak valid. Silakan lengkapi nomor telepon di halaman Profil (My Account) terlebih dahulu.'
      };
    }

    // Prepare Biteship order payload for return shipment
    // Origin = Customer, Destination = Store

    // Map courier to Biteship courier codes
    let courierCompany = 'sicepat';
    let courierType = 'reg'; // Default: SiCepat Regular

    if (courier === 'sicepat') {
      courierCompany = 'sicepat';
      courierType = 'reg'; // SiCepat Regular
    } else if (courier === 'jnt') {
      courierCompany = 'jnt';
      courierType = 'ez'; // J&T Express Easy
    }

    const deliveryType = 'now';

    const orderPayload: any = {
      origin_contact_name: customerName,
      origin_contact_phone: cleanPhone,
      origin_address: customerStreetAddress,
      origin_postal_code: parseInt(customerPostalCode) || 46181,
      destination_contact_name: storeAddress.name,
      destination_contact_phone: storeAddress.phone,
      destination_address: storeAddress.address,
      destination_postal_code: parseInt(storeAddress.postal_code),
      courier_company: courierCompany,
      courier_type: courierType,
      delivery_type: deliveryType,
      origin_collection_method: 'pickup', // Always pickup
      order_note: `Return PICKUP for order ${returnData.order_number || returnData.id} via ${courierCompany.toUpperCase()}. Courier will pickup from customer.`,
      items: [
        {
          name: 'Return Item',
          description: `Return: ${returnData.reason || 'Product return'}`,
          value: 100000, // Dummy value
          weight: 1000, // 1kg default
          quantity: 1,
        },
      ],
    };

    console.log('[Arrange Shipping] Biteship payload:', JSON.stringify(orderPayload, null, 2));

    // Call Biteship API to create order
    const biteshipResponse = await fetch('https://api.biteship.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': BITESHIP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    const biteshipData = await biteshipResponse.json();

    console.log('[Arrange Shipping] Biteship response:', JSON.stringify(biteshipData, null, 2));

    if (!biteshipResponse.ok || !biteshipData.success) {
      console.error('Biteship API error:', biteshipData);
      return {
        success: false,
        error: biteshipData.error || biteshipData.message || 'Failed to create shipping order',
      };
    }

    // Extract waybill/tracking number - check multiple possible locations
    const waybill = biteshipData.courier?.waybill_id
      || biteshipData.order?.waybill_id
      || biteshipData.data?.courier?.waybill_id
      || biteshipData.data?.order?.waybill_id
      || biteshipData.waybill_id
      || '';

    // Default service name based on selected courier
    const defaultServiceName = courier === 'sicepat' ? 'SiCepat Regular' : 'J&T Express Easy';
    const service = biteshipData.courier?.name || biteshipData.data?.courier?.name || defaultServiceName;

    console.log('[Arrange Shipping] Waybill generated:', waybill);

    if (!waybill) {
      console.error('[Arrange Shipping] Warning: No waybill found in response');
    }

    return {
      success: true,
      waybill,
      service,
    };
  } catch (error: any) {
    console.error('Error generating waybill:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate waybill',
    };
  }
}
