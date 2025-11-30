import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createReturnShipment } from '@/server/biteship'

/**
 * API Endpoint: Approve Return Request & Auto-Generate JNT Resi
 * 
 * POST /api/returns/approve
 * Body: { return_id: string }
 * 
 * Flow:
 * 1. Fetch return data + order data + user address
 * 2. Generate JNT return shipment via Biteship (origin=user, destination=toko)
 * 3. Update return status to 'approved' + save waybill
 * 4. Return response with resi number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { return_id } = body

    if (!return_id) {
      return NextResponse.json(
        { success: false, message: 'return_id is required' },
        { status: 400 }
      )
    }

    // 1. Fetch return data dengan order & order_items
    const { data: returnData, error: returnError } = await supabase
      .from('returns')
      .select(`
        *,
        orders (
          id,
          order_number,
          shipping_address,
          total_amount,
          order_items (
            quantity,
            size,
            price,
            produk (
              id,
              nama_produk,
              deskripsi,
              harga,
              photo1
            )
          )
        ),
        users (
          id,
          nama,
          email,
          shipping_nama,
          shipping_phone,
          shipping_street,
          shipping_kecamatan,
          shipping_provinsi,
          shipping_postal_code
        )
      `)
      .eq('id', return_id)
      .single()

    if (returnError || !returnData) {
      console.error('[Returns Approve] Error fetching return:', returnError)
      return NextResponse.json(
        { success: false, message: 'Return request not found' },
        { status: 404 }
      )
    }

    // Check if already approved
    if (returnData.status === 'approved' || returnData.return_waybill) {
      return NextResponse.json(
        {
          success: false,
          message: 'Return already approved',
          waybill: returnData.return_waybill
        },
        { status: 400 }
      )
    }

    // 2. Parse user address from order shipping_address or user profile
    let userAddress: any = {}
    
    // Try to parse from order shipping_address (JSON string)
    if (returnData.orders?.shipping_address) {
      try {
        // shipping_address bisa berupa JSON string atau plain text
        const shippingAddr = typeof returnData.orders.shipping_address === 'string'
          ? JSON.parse(returnData.orders.shipping_address)
          : returnData.orders.shipping_address

        userAddress = {
          nama: shippingAddr.nama || returnData.users?.shipping_nama || returnData.users?.nama,
          telepon: shippingAddr.telepon || returnData.users?.shipping_phone,
          email: shippingAddr.email || returnData.users?.email,
          alamat: shippingAddr.alamat || shippingAddr.street || returnData.users?.shipping_street,
          kota: shippingAddr.kota || shippingAddr.city,
          provinsi: shippingAddr.provinsi || shippingAddr.province || returnData.users?.shipping_provinsi,
          kecamatan: shippingAddr.kecamatan || shippingAddr.district || returnData.users?.shipping_kecamatan,
          kode_pos: shippingAddr.kode_pos || shippingAddr.postal_code || returnData.users?.shipping_postal_code,
          catatan: shippingAddr.catatan || shippingAddr.note || 'Pickup barang pengembalian'
        }
      } catch (e) {
        // If JSON parse fails, use plain text
        userAddress = {
          nama: returnData.users?.shipping_nama || returnData.users?.nama || 'Pelanggan',
          telepon: returnData.users?.shipping_phone || '0812345678',
          email: returnData.users?.email,
          alamat: returnData.orders.shipping_address,
          kode_pos: returnData.users?.shipping_postal_code || '46151',
          catatan: 'Pickup barang pengembalian'
        }
      }
    } else {
      // Fallback to user profile
      userAddress = {
        nama: returnData.users?.shipping_nama || returnData.users?.nama || 'Pelanggan',
        telepon: returnData.users?.shipping_phone || '0812345678',
        email: returnData.users?.email,
        alamat: returnData.users?.shipping_street || 'Alamat tidak tersedia',
        kota: '',
        provinsi: returnData.users?.shipping_provinsi || '',
        kecamatan: returnData.users?.shipping_kecamatan || '',
        kode_pos: returnData.users?.shipping_postal_code || '46151',
        catatan: 'Pickup barang pengembalian'
      }
    }

    // Validate required address fields
    if (!userAddress.alamat || !userAddress.kode_pos) {
      return NextResponse.json(
        {
          success: false,
          message: 'Alamat user tidak lengkap. Pastikan alamat dan kode pos tersedia.'
        },
        { status: 400 }
      )
    }

    // 3. Build items from order_items
    const orderItems = returnData.orders?.order_items || []
    const items = orderItems.map((item: any) => ({
      nama_produk: item.produk?.nama_produk || 'Produk',
      deskripsi: item.produk?.deskripsi || '',
      harga_satuan: item.price || item.produk?.harga || 0,
      quantity: item.quantity || 1,
      weight: 500 // default 500g per item
    }))

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tidak ada produk dalam pesanan untuk dikembalikan'
        },
        { status: 400 }
      )
    }

    // 4. Generate JNT return shipment via Biteship
    console.log('[Returns Approve] Generating JNT return shipment...', {
      returnId: return_id,
      userAddress,
      itemsCount: items.length
    })

    const shipmentResult = await createReturnShipment({
      returnId: return_id,
      userAddress,
      items,
      orderAmount: returnData.orders?.total_amount || 0
    })

    if (!shipmentResult || !shipmentResult.success) {
      console.error('[Returns Approve] Failed to create return shipment:', shipmentResult)
      return NextResponse.json(
        {
          success: false,
          message: shipmentResult?.message || 'Gagal membuat resi pengembalian via Biteship',
          error: shipmentResult
        },
        { status: 500 }
      )
    }

    const waybill = shipmentResult.waybill

    if (!waybill) {
      return NextResponse.json(
        {
          success: false,
          message: 'Resi tidak digenerate oleh Biteship',
          shipment: shipmentResult
        },
        { status: 500 }
      )
    }

    // 5. Update return status to 'approved' + save waybill
    const { error: updateError } = await supabase
      .from('returns')
      .update({
        status: 'approved',
        return_waybill: waybill,
        notes: `Resi JNT: ${waybill}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', return_id)

    if (updateError) {
      console.error('[Returns Approve] Error updating return:', updateError)
      return NextResponse.json(
        {
          success: false,
          message: 'Gagal update status return',
          error: updateError.message
        },
        { status: 500 }
      )
    }

    // 6. Success response
    return NextResponse.json({
      success: true,
      message: 'Return berhasil di-approve dan resi JNT telah digenerate',
      data: {
        return_id,
        status: 'approved',
        waybill,
        tracking_url: shipmentResult.trackingUrl,
        courier: 'J&T Express',
        pickup_address: `${userAddress.alamat}, ${userAddress.kecamatan}, ${userAddress.kota}, ${userAddress.provinsi}`,
        destination: 'Meoris Warehouse, Tasikmalaya'
      }
    })
  } catch (error: any) {
    console.error('[Returns Approve] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error.message
      },
      { status: 500 }
    )
  }
}
