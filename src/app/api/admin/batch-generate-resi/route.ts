import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createBiteshipShipment } from '@/server/biteship'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderIds } = body

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Order IDs array is required' }, { status: 400 })
    }

    const results: any[] = []
    const errors: any[] = []

    for (const orderId of orderIds) {
      try {
        // Get order data
        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .select('*, checkout_submissions!orders_checkout_submission_id_fkey(*)')
          .eq('id', orderId)
          .single()

        if (orderError || !order) {
          errors.push({
            orderId,
            error: 'Order not found'
          })
          continue
        }

        // Validasi: Order harus status PAID
        if (order.status !== 'paid') {
          errors.push({
            orderId,
            error: 'Order bukan status PAID',
            currentStatus: order.status
          })
          continue
        }

        // Cek apakah resi sudah ada
        const existingResi = order.shipping_resi
        if (existingResi && existingResi !== 'Menunggu pesanan dikirim ke jasa kirim' && existingResi.length > 10) {
          errors.push({
            orderId,
            error: 'Resi sudah ada',
            resi: existingResi
          })
          continue
        }

        // Get submission data
        const submission = Array.isArray(order.checkout_submissions)
          ? order.checkout_submissions[0]
          : order.checkout_submissions

        if (!submission || !submission.shipping_address) {
          errors.push({
            orderId,
            error: 'Data alamat pengiriman tidak ditemukan'
          })
          continue
        }

        // Generate shipment via Biteship
        const shipment = await createBiteshipShipment({
          orderId,
          submission
        })

        if (!shipment?.success) {
          errors.push({
            orderId,
            error: 'Gagal membuat shipment',
            message: shipment?.message
          })
          continue
        }

        // Update order dengan resi baru
        const updates: Record<string, any> = {
          shipping_status: 'Pesanan sedang dikemas',
          status: 'processing'
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
          generated_by: 'admin_batch',
          generated_at: new Date().toISOString()
        }

        if (shipment.raw) {
          biteshipMeta.raw = shipment.raw
        }

        updates.shipping_address_json = {
          ...baseAddress,
          biteship: biteshipMeta
        }

        await supabaseAdmin
          .from('orders')
          .update(updates)
          .eq('id', orderId)

        results.push({
          orderId,
          success: true,
          waybill: shipment.waybill,
          courier: `${shipment.courierCode} ${shipment.courierService}`
        })

        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error: any) {
        errors.push({
          orderId,
          error: error.message || 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: orderIds.length,
        succeeded: results.length,
        failed: errors.length
      },
      results,
      errors
    })

  } catch (error: any) {
    console.error('[Admin] Batch generate resi error:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
