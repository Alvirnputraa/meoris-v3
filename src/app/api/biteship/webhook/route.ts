import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Status mapping dari Biteship ke database
function mapBiteshipStatus(biteshipStatus: string): string {
  const statusMap: Record<string, string> = {
    // Biteship status -> database status
    'confirmed': 'Menunggu pesanan diserahkan ke pihak jasa kirim',
    'allocated': 'Menunggu penjemputan kurir',
    'picking_up': 'Kurir menuju lokasi penjemputan',
    'picked': 'Pesanan telah diserahkan ke jasa kirim',
    'dropping_off': 'Dalam Pengiriman',
    'delivered': 'Terkirim',
    'cancelled': 'Dibatalkan',
    'rejected': 'Ditolak',
    'courier_not_found': 'Kurir Tidak Ditemukan',
    'returned': 'Dikembalikan',
    'on_hold': 'Ditahan',
    'return_in_transit': 'Sedang Dikembalikan',
    'disposed': 'Dibuang'
  }

  // Default status jika status tidak ditemukan
  return statusMap[biteshipStatus] || 'Pesanan sedang dikemas'
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body (handle empty body for installation test)
    let body: any = {}

    try {
      const text = await request.text()
      if (text && text.trim()) {
        body = JSON.parse(text)
      }
    } catch (e) {
      console.log('Empty or invalid JSON body (installation test)')
    }

    // Biteship installation test: empty body or no event
    // Return OK response immediately
    if (!body || Object.keys(body).length === 0 || !body.event) {
      console.log('Biteship installation test - returning OK')
      return NextResponse.json({
        success: true,
        message: 'ok'
      }, { status: 200 })
    }

    console.log('Biteship webhook received:', JSON.stringify(body, null, 2))

    // Verifikasi signature (skip for installation test)
    const signature = request.headers.get('X-Biteship-Signature')
    const expectedSignature = process.env.BITESHIP_WEBHOOK_SECRET

    if (expectedSignature && signature && signature !== expectedSignature) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Biteship webhook payload structure:
    // {
    //   "event": "order.status",
    //   "order_id": "your_order_id_from_metadata",
    //   "courier_tracking_id": "BITESHIP123",
    //   "courier_waybill_id": "JNE123456789",
    //   "status": "picked",
    //   "courier_name": "JNE",
    //   ... other fields
    // }

    const { event, order_id, courier_waybill_id, status, courier_name, courier_tracking_id } = body

    // If no order_id and no courier_waybill_id, just return OK (might be a test webhook)
    if (!order_id && !courier_waybill_id) {
      console.log('No order_id or courier_waybill_id in webhook payload - returning OK')
      return NextResponse.json({
        success: true,
        message: 'ok'
      }, { status: 200 })
    }

    // Find the order/return in database
    // Biteship sends their internal order_id, but we need our UUID
    // Match by courier_waybill_id (stored in shipping_resi, return_waybill, or replacement_waybill column)
    let dbOrderId = order_id
    let dbReturnId = null
    let isReturn = false
    let isReplacement = false

    if (courier_waybill_id) {
      console.log(`Looking up order/return/replacement by courier_waybill_id: ${courier_waybill_id}`)

      // First, check if this is a regular order
      const { data: orderData, error: lookupError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('shipping_resi', courier_waybill_id)
        .maybeSingle()

      if (orderData) {
        dbOrderId = orderData.id
        console.log(`Found regular order UUID: ${dbOrderId}`)
      } else {
        // If not found in orders, check if it's a return shipment
        console.log(`Not found in orders, checking returns table for return_waybill...`)
        const { data: returnData, error: returnLookupError } = await supabaseAdmin
          .from('returns')
          .select('id, order_id')
          .eq('return_waybill', courier_waybill_id)
          .maybeSingle()

        if (returnData) {
          dbReturnId = returnData.id
          dbOrderId = returnData.order_id
          isReturn = true
          console.log(`Found return shipment UUID: ${dbReturnId}, Order: ${dbOrderId}`)
        } else {
          // If not found in return_waybill, check for replacement_waybill
          console.log(`Not found in return_waybill, checking replacement_waybill...`)
          const { data: replacementData, error: replacementLookupError } = await supabaseAdmin
            .from('returns')
            .select('id, order_id')
            .eq('replacement_waybill', courier_waybill_id)
            .maybeSingle()

          if (replacementData) {
            dbReturnId = replacementData.id
            dbOrderId = replacementData.order_id
            isReplacement = true
            console.log(`Found replacement shipment UUID: ${dbReturnId}, Order: ${dbOrderId}`)
          } else {
            console.log(`Order/Return/Replacement not found for waybill ${courier_waybill_id}, trying order_id: ${order_id}`)
          }
        }
      }
    }

    // Update berdasarkan event type
    if (event === 'order.status' && status) {
      const mappedStatus = mapBiteshipStatus(status)

      if (isReturn && dbReturnId) {
        // Handle return shipment tracking
        console.log(`Updating return ${dbReturnId}: ${status} -> ${mappedStatus}`)

        // Insert ke return_shipping_history untuk tracking timeline
        const { error: historyError } = await supabaseAdmin
          .from('return_shipping_history')
          .insert({
            return_id: dbReturnId,
            biteship_order_id: body.order_id || null,
            courier_tracking_id: courier_tracking_id || null,
            courier_waybill_id: courier_waybill_id || null,
            courier_company: body.courier_company || courier_name || null,
            courier_type: body.courier_type || null,
            courier_driver_name: body.courier_driver_name || null,
            courier_driver_phone: body.courier_driver_phone || null,
            courier_driver_plate_number: body.courier_driver_plate_number || null,
            courier_link: body.courier_link || null,
            biteship_status: status,
            status_display: mappedStatus,
            note: mappedStatus
            // Note: updated_at akan di-set otomatis oleh database default value
          })

        if (historyError) {
          console.error('Error inserting return shipping history:', historyError)
          console.error('Full error details:', JSON.stringify(historyError, null, 2))
          return NextResponse.json({
            error: 'Database update failed',
            details: historyError.message || 'Unknown error',
            code: historyError.code || 'N/A'
          }, { status: 500 })
        }

        console.log(`✅ Return shipping history created for return ${dbReturnId}`)

        // AUTO-UPDATE: Jika status = delivered, update return status ke 'validating'
        if (status === 'delivered') {
          console.log(`🔄 Auto-updating return ${dbReturnId} status to 'validating' (barang sudah terkirim ke Meoris)`)

          const { error: returnUpdateError } = await supabaseAdmin
            .from('returns')
            .update({
              status: 'validating',
              notes: 'Barang sudah kami terima. Sedang dalam proses validasi.'
            })
            .eq('id', dbReturnId)

          if (returnUpdateError) {
            console.error('❌ Error updating return status to validating:', returnUpdateError)
            // Tidak return error, karena history sudah tersimpan dengan sukses
            // Status update adalah optional enhancement
          } else {
            console.log(`✅ Return ${dbReturnId} status updated to 'validating'`)
          }
        }

      } else if (isReplacement && dbReturnId) {
        // Handle replacement shipment tracking (Meoris -> Customer)
        console.log(`Updating replacement ${dbReturnId}: ${status} -> ${mappedStatus}`)

        // Insert ke replacement_shipping_history untuk tracking timeline
        const { error: historyError } = await supabaseAdmin
          .from('replacement_shipping_history')
          .insert({
            return_id: dbReturnId,
            biteship_order_id: body.order_id || null,
            courier_tracking_id: courier_tracking_id || null,
            courier_waybill_id: courier_waybill_id || null,
            courier_company: body.courier_company || courier_name || null,
            courier_type: body.courier_type || null,
            courier_driver_name: body.courier_driver_name || null,
            courier_driver_phone: body.courier_driver_phone || null,
            courier_driver_plate_number: body.courier_driver_plate_number || null,
            courier_link: body.courier_link || null,
            biteship_status: status,
            status_display: mappedStatus,
            note: mappedStatus
            // Note: updated_at akan di-set otomatis oleh database default value
          })

        if (historyError) {
          console.error('Error inserting replacement shipping history:', historyError)
          console.error('Full error details:', JSON.stringify(historyError, null, 2))
          return NextResponse.json({
            error: 'Database update failed',
            details: historyError.message || 'Unknown error',
            code: historyError.code || 'N/A'
          }, { status: 500 })
        }

        console.log(`✅ Replacement shipping history created for return ${dbReturnId}`)

        // 🎉 AUTO-COMPLETE: Jika status = delivered, complete the order!
        if (status === 'delivered') {
          console.log(`🎉 Replacement delivered! Auto-completing order ${dbOrderId} and return ${dbReturnId}`)

          // 1. Update return status to 'completed'
          const { error: returnUpdateError } = await supabaseAdmin
            .from('returns')
            .update({
              status: 'completed',
              notes: 'Produk pengganti telah diterima pelanggan. Pengembalian selesai.'
            })
            .eq('id', dbReturnId)

          if (returnUpdateError) {
            console.error('❌ Error updating return status to completed:', returnUpdateError)
          } else {
            console.log(`✅ Return ${dbReturnId} status updated to 'completed'`)
          }

          // 2. Update order status to 'completed'
          const { error: orderUpdateError } = await supabaseAdmin
            .from('orders')
            .update({
              status: 'completed'
            })
            .eq('id', dbOrderId)

          if (orderUpdateError) {
            console.error('❌ Error updating order status to completed:', orderUpdateError)
          } else {
            console.log(`✅ Order ${dbOrderId} status updated to 'completed'`)
          }

          // 3. Create notification for user
          const { error: notifError } = await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: (await supabaseAdmin
                .from('orders')
                .select('user_id')
                .eq('id', dbOrderId)
                .single()).data?.user_id,
              order_id: dbOrderId,
              type: 'order_completed',
              title: 'Pesanan Selesai',
              message: 'Produk pengganti telah diterima. Terima kasih telah berbelanja di Meoris!',
              read: false
            })

          if (notifError) {
            console.error('❌ Error creating notification:', notifError)
          } else {
            console.log(`✅ Notification created for order ${dbOrderId}`)
          }

          console.log(`🎉 Auto-complete replacement successful!`)
        }

      } else {
        // Handle regular order shipment tracking
        console.log(`Updating order ${dbOrderId}: ${status} -> ${mappedStatus}`)

        // Prepare update data
        const updateData: any = {
          shipping_status: mappedStatus,
          updated_at: new Date().toISOString()
        }

        // AUTO-UPDATE: Jika status = delivered, update order status ke 'delivered'
        // Agar otomatis pindah ke tab "Selesai" di halaman purchase
        if (status === 'delivered') {
          updateData.status = 'delivered'
          console.log(`🔄 Auto-updating order ${dbOrderId} status to 'delivered' (paket sudah terkirim)`)
        }

        // 1. Update orders table
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update(updateData)
          .eq('id', dbOrderId)

        if (updateError) {
          console.error('Error updating shipping status:', updateError)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }

        console.log(`✅ Order ${dbOrderId} status updated to: ${mappedStatus}`)

        // 2. Insert ke shipping_history untuk tracking timeline
        const { error: historyError } = await supabaseAdmin
          .from('shipping_history')
          .insert({
            order_id: dbOrderId,
            event_type: 'order.status',
            biteship_status: status,
            status_display: mappedStatus,
            courier_name: courier_name || null,
            courier_tracking_id: courier_tracking_id || null,
            courier_waybill_id: courier_waybill_id || null,
            webhook_payload: body
          })

        if (historyError) {
          console.error('Error inserting shipping history:', historyError)
          // Tidak return error, karena update orders sudah berhasil
          // History hanya untuk tracking, bukan critical
        } else {
          console.log(`✅ Shipping history created for order ${dbOrderId}`)
        }
      }
    }

    if (event === 'order.waybill_id' && courier_waybill_id) {
      if (isReturn && dbReturnId) {
        // Handle return waybill update
        console.log(`Updating return ${dbReturnId} waybill: ${courier_waybill_id}`)

        // Insert ke return_shipping_history
        const { error: historyError } = await supabaseAdmin
          .from('return_shipping_history')
          .insert({
            return_id: dbReturnId,
            biteship_order_id: body.order_id || null,
            courier_tracking_id: courier_tracking_id || null,
            courier_waybill_id: courier_waybill_id,
            courier_company: body.courier_company || courier_name || null,
            courier_type: body.courier_type || null,
            courier_link: body.courier_link || null,
            biteship_status: null,
            status_display: 'Nomor resi diterima',
            note: 'Nomor resi diterima'
          })

        if (historyError) {
          console.error('Error inserting return shipping history:', historyError)
          console.error('Full error details:', JSON.stringify(historyError, null, 2))
          return NextResponse.json({
            error: 'Database update failed',
            details: historyError.message || 'Unknown error',
            code: historyError.code || 'N/A'
          }, { status: 500 })
        }

        console.log(`✅ Return shipping history created for waybill ${courier_waybill_id}`)

      } else if (isReplacement && dbReturnId) {
        // Handle replacement waybill update
        console.log(`Updating replacement ${dbReturnId} waybill: ${courier_waybill_id}`)

        // Insert ke replacement_shipping_history
        const { error: historyError } = await supabaseAdmin
          .from('replacement_shipping_history')
          .insert({
            return_id: dbReturnId,
            biteship_order_id: body.order_id || null,
            courier_tracking_id: courier_tracking_id || null,
            courier_waybill_id: courier_waybill_id,
            courier_company: body.courier_company || courier_name || null,
            courier_type: body.courier_type || null,
            courier_link: body.courier_link || null,
            biteship_status: null,
            status_display: 'Nomor resi diterima',
            note: 'Nomor resi diterima'
          })

        if (historyError) {
          console.error('Error inserting replacement shipping history:', historyError)
          console.error('Full error details:', JSON.stringify(historyError, null, 2))
          return NextResponse.json({
            error: 'Database update failed',
            details: historyError.message || 'Unknown error',
            code: historyError.code || 'N/A'
          }, { status: 500 })
        }

        console.log(`✅ Replacement shipping history created for waybill ${courier_waybill_id}`)

      } else {
        // Handle regular order waybill update
        console.log(`Updating order ${dbOrderId} waybill: ${courier_waybill_id}`)

        // 1. Update orders table (tetap seperti sebelumnya)
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            shipping_resi: courier_waybill_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', dbOrderId)

        if (updateError) {
          console.error('Error updating waybill:', updateError)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }

        console.log(`✅ Order ${dbOrderId} waybill updated to: ${courier_waybill_id}`)

        // 2. Insert ke shipping_history untuk tracking timeline
        const { error: historyError } = await supabaseAdmin
          .from('shipping_history')
          .insert({
            order_id: dbOrderId,
            event_type: 'order.waybill_id',
            biteship_status: null,
            status_display: 'Nomor resi diterima',
            courier_name: courier_name || null,
            courier_tracking_id: courier_tracking_id || null,
            courier_waybill_id: courier_waybill_id,
            webhook_payload: body
          })

        if (historyError) {
          console.error('Error inserting shipping history:', historyError)
          // Tidak return error, karena update orders sudah berhasil
        } else {
          console.log(`✅ Shipping history created for waybill ${courier_waybill_id}`)
        }
      }
    }

    // Biteship expects 200 OK response
    return NextResponse.json({
      success: true,
      message: 'ok'
    }, { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET method untuk testing (Biteship installation check)
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'ok',
    timestamp: new Date().toISOString()
  }, { status: 200 })
}
