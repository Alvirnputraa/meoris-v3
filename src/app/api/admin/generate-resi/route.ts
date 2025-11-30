import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createBiteshipShipment } from '@/server/biteship'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Get order data
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, checkout_submissions!orders_checkout_submission_id_fkey(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Validasi: Order harus status PAID
    if (order.status !== 'paid') {
      return NextResponse.json({
        error: 'Order harus berstatus PAID untuk generate resi',
        currentStatus: order.status
      }, { status: 400 })
    }

    // Cek apakah resi sudah ada (resi valid biasanya berisi kode tracking dari kurir)
    const existingResi = order.shipping_resi
    const isDraftResi = !existingResi ||
                        existingResi === 'Menunggu pesanan dikirim ke jasa kirim' ||
                        existingResi === 'Menunggu konfirmasi admin' ||
                        existingResi.startsWith('Menunggu')

    if (!isDraftResi) {
      return NextResponse.json({
        error: 'Resi sudah dibuat sebelumnya',
        resi: existingResi
      }, { status: 400 })
    }

    // Get submission data
    const submission = Array.isArray(order.checkout_submissions)
      ? order.checkout_submissions[0]
      : order.checkout_submissions

    if (!submission || !submission.shipping_address) {
      return NextResponse.json({
        error: 'Data alamat pengiriman tidak ditemukan'
      }, { status: 400 })
    }

    // Generate shipment via Biteship
    console.log('[Admin] Generating Biteship shipment for order:', orderId)

    const shipment = await createBiteshipShipment({
      orderId,
      submission
    })

    if (!shipment?.success) {
      return NextResponse.json({
        error: 'Gagal membuat shipment di Biteship',
        message: shipment?.message || 'Unknown error',
        details: shipment?.raw
      }, { status: 500 })
    }

    // Update order dengan resi baru
    const updates: Record<string, any> = {
      shipping_status: 'Pesanan siap dikirim',
      status: 'shipped' // Update status ke SHIPPED setelah resi dibuat
    }

    if (shipment.waybill) {
      updates.shipping_resi = shipment.waybill
    }

    const baseAddress = order.shipping_address_json || submission.shipping_address || {}

    const biteshipMeta: Record<string, any> = {
      order_id: shipment.orderId || null,
      courier_code: shipment.courierCode || null,
      courier_service: shipment.courierService || null,
      tracking_url: shipment.trackingUrl || null,
      waybill: shipment.waybill || null,
      generated_by: 'admin',
      generated_at: new Date().toISOString()
    }

    if (shipment.raw) {
      biteshipMeta.raw = shipment.raw
    }

    updates.shipping_address_json = {
      ...baseAddress,
      biteship: biteshipMeta
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', orderId)

    if (updateError) {
      console.error('[Admin] Failed to update order:', updateError)
      return NextResponse.json({
        error: 'Gagal update order dengan resi baru',
        details: updateError
      }, { status: 500 })
    }

    console.log('[Admin] Resi generated successfully:', {
      orderId,
      waybill: shipment.waybill,
      courier: `${shipment.courierCode} ${shipment.courierService}`
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        waybill: shipment.waybill,
        trackingUrl: shipment.trackingUrl,
        courier: {
          code: shipment.courierCode,
          service: shipment.courierService
        }
      }
    })

  } catch (error: any) {
    console.error('[Admin] Generate resi error:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
