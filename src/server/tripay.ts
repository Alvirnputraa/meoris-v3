import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createBiteshipShipment } from './biteship'

export function verifyTripaySignature(rawBody: string, signature: string, privateKey: string) {
  const expect = crypto.createHmac('sha256', privateKey).update(rawBody).digest('hex')
  return signature && signature.toLowerCase() === expect.toLowerCase()
}

async function sendInvoiceIfNeeded(orderId: string, submission: any) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const from = process.env.RESEND_FROM || 'Meoris <no-reply@meoris-noreply.erdanpee.com>'

  const { data: orderRecord } = await supabaseAdmin
    .from('orders')
    .select('id, payment_details, shipping_resi, shipping_address_json')
    .eq('id', orderId)
    .maybeSingle()

  if (!orderRecord) return

  const paymentDetails: any = orderRecord.payment_details || {}
  if (paymentDetails.invoice_sent_at) {
    return
  }

  let toEmail: string | undefined
  try {
    const { data: userResp } = await supabaseAdmin.auth.admin.getUserById(submission.user_id)
    toEmail = userResp?.user?.email || undefined
  } catch {}
  if (!toEmail) {
    try {
      toEmail =
        (submission.shipping_address && (submission.shipping_address as any).email) || undefined
    } catch {
      toEmail = undefined
    }
  }
  if (!toEmail) return

  const orderShort = String(orderId).replace(/-/g, '').slice(0, 8)
  const orderNumber = orderShort
  const createdDate = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const totalAmount = Number(submission.total || 0)
  const items = Array.isArray(submission.items) ? submission.items : []
  const biteshipMeta =
    orderRecord.shipping_address_json && typeof orderRecord.shipping_address_json === 'object'
      ? (orderRecord.shipping_address_json as any).biteship || null
      : null
  const courierLabel = (() => {
    if (biteshipMeta?.courier_code) {
      const code = String(biteshipMeta.courier_code || '').toUpperCase()
      const service = biteshipMeta.courier_service ? String(biteshipMeta.courier_service).toUpperCase() : ''
      return service ? `${code} ${service}` : code
    }
    return submission.shipping_method || 'Belum ditentukan'
  })()
  const waybill =
    (orderRecord.shipping_resi && String(orderRecord.shipping_resi).trim()) ||
    (biteshipMeta?.waybill && String(biteshipMeta.waybill)) ||
    'Pesanan belum dikirim ke jasa kirim'
  const trackingUrl = biteshipMeta?.tracking_url
  const rows = items
    .map((it: any) => {
      const qty = Number(it.quantity || 1)
      const price = Number(it.harga_satuan || 0)
      const subtotal = qty * price
      const name = it.nama_produk || 'Produk'
      const size = it.size ? ` (Uk: ${it.size})` : ''
      return `<tr><td style="padding:8px 0;">${name}${size}</td><td style="padding:8px 0;text-align:center;">${qty}</td><td style="padding:8px 0;text-align:right;">Rp ${price.toLocaleString('id-ID')}</td><td style="padding:8px 0;text-align:right;">Rp ${subtotal.toLocaleString('id-ID')}</td></tr>`
    })
    .join('')
  const shippingSection = `
          <tr>
            <td style="padding:18px 20px 14px 20px;text-align:center;border-top:1px solid #eee;border-bottom:1px solid #eee;">
              <div style="font-size:14px;color:#333;">
                <div style="font-weight:600;letter-spacing:0.5px;">Informasi Pengiriman</div>
                <div style="margin-top:6px;"><strong>Ekspedisi:</strong> ${courierLabel}</div>
                <div style="margin-top:2px;"><strong>Nomor Resi:</strong> ${waybill}</div>
                ${
                  trackingUrl
                    ? `<div style="margin-top:8px;"><a href="${trackingUrl}" style="display:inline-flex;align-items:center;padding:6px 16px;border-radius:999px;border:1px solid #111;font-size:12px;color:#111;text-decoration:none;">Lacak Pengiriman</a></div>`
                    : ''
                }
              </div>
            </td>
          </tr>`

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Invoice Meoris</title></head><body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;">
      <tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#000;padding:16px 20px;color:#fff;font-weight:700;font-size:20px;letter-spacing:1px;">MEORIS</td></tr>
          <tr><td style="padding:18px 20px 6px 20px;"><div style="font-weight:700;font-size:18px;">Invoice Pembayaran</div></td></tr>
          <tr><td style="padding:0 20px 10px 20px;color:#333;">
            <div style="font-size:14px;line-height:20px;">Terima kasih, pembayaran Anda telah kami terima.</div>
            <div style="margin-top:6px;font-size:13px;color:#555;">Order: <strong>#${orderNumber}</strong> - Tanggal: ${createdDate}</div>
          </td></tr>
          ${shippingSection}
          <tr><td style="padding:4px 20px 8px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#111;border-bottom:1px solid #eee;">
              <tr>
                <th align="left" style="padding:10px 0;text-align:left;">Produk</th>
                <th align="center" style="padding:10px 0;">Qty</th>
                <th align="right" style="padding:10px 0;">Harga</th>
                <th align="right" style="padding:10px 0;">Subtotal</th>
              </tr>
              ${rows || ''}
            </table>
          </td></tr>
          <tr><td style="padding:10px 20px;">
            <div style="text-align:right;font-size:14px;"><strong>Total: Rp ${totalAmount.toLocaleString(
              'id-ID'
            )}</strong></div>
          </td></tr>
          <tr><td style="padding:10px 20px 18px 20px;color:#666;font-size:12px;">Status pesanan: <strong>Paid</strong>. Anda dapat melacak pengiriman melalui halaman pesanan Anda.</td></tr>
        </table>
        <div style="font-size:11px;color:#9aa0a6;margin-top:12px;">&copy; ${new Date().getFullYear()} Meoris. Semua hak dilindungi.</div>
      </td></tr>
    </table>
  </body></html>`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [toEmail], subject: `Invoice #${orderNumber} - Meoris`, html })
    })

    const newDetails = { ...paymentDetails, invoice_sent_at: new Date().toISOString() }
    await supabaseAdmin
      .from('orders')
      .update({ payment_details: newDetails as any })
      .eq('id', orderId)
  } catch (err) {
    console.error('Failed to send invoice email:', err)
  }
}

export async function processTripayCallback(rawBody: string, signature: string) {
  const privateKey = process.env.TRIPAY_PRIVATE_KEY
  if (!privateKey) throw new Error('Missing TRIPAY_PRIVATE_KEY')
  if (!verifyTripaySignature(rawBody, signature, privateKey)) {
    const e: any = new Error('Invalid signature')
    e.status = 401
    throw e
  }

  const payload = JSON.parse(rawBody)
  const reference: string | undefined = payload?.reference || payload?.data?.reference
  const merchantRef: string | undefined = payload?.merchant_ref || payload?.data?.merchant_ref
  const status: string = (payload?.status || payload?.data?.status || '').toString().toLowerCase()

  if (!reference && !merchantRef) {
    const e: any = new Error('Missing reference')
    e.status = 400
    throw e
  }

  const { data: subByRef } = await supabaseAdmin
    .from('checkout_submissions')
    .select('*')
    .eq('payment_reference', reference || '')
    .maybeSingle()
  let submission: any = subByRef
  if (!submission && merchantRef) {
    const { data: subByMerchant } = await supabaseAdmin
      .from('checkout_submissions')
      .select('*')
      .eq('id', merchantRef)
      .maybeSingle()
    submission = subByMerchant
  }
  if (!submission) {
    const e: any = new Error('Submission not found')
    e.status = 404
    throw e
  }

  const newStatus = status === 'paid' || status === 'success' ? 'paid' : status
  await supabaseAdmin
    .from('checkout_submissions')
    .update({
      status: newStatus,
      payment_reference: reference || submission.payment_reference || null,
      payment_details: payload
    })
    .eq('id', submission.id)

  if (newStatus === 'paid') {
    const { data: existing } = await supabaseAdmin
      .from('orders')
      .select('id, shipping_resi, shipping_address_json')
      .eq('payment_reference', reference || submission.payment_reference)
      .maybeSingle()

    let orderId: string | undefined = existing?.id
    let existingResi: string | null =
      typeof existing?.shipping_resi === 'string' ? existing.shipping_resi : null
    let existingShippingAddress: any =
      existing?.shipping_address_json && typeof existing.shipping_address_json === 'object'
        ? existing.shipping_address_json
        : null

    if (!orderId) {
      const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert({
          user_id: submission.user_id,
          order_number: reference || merchantRef || submission.id,
          payment_reference: reference || submission.payment_reference || null,
          total_amount: Number(submission.total || 0),
          status: 'paid',
          payment_method: submission.payment_method || submission.shipping_method || null,
          shipping_address_json: submission.shipping_address || null,
          checkout_submission_id: submission.id,
          payment_details: submission.payment_details || payload,
          payment_expired_at: submission.payment_expired_at || null,
          shipping_status: 'Sedang dikemas'
        })
        .select('id')
        .single()
      if (orderErr) throw orderErr
      orderId = order.id
      existingResi = null
      existingShippingAddress =
        submission.shipping_address && typeof submission.shipping_address === 'object'
          ? submission.shipping_address
          : null

      const items = Array.isArray(submission.items) ? submission.items : []
      if (items.length > 0) {
        const toInsert = items.map((it: any) => ({
          order_id: orderId!,
          produk_id: it.produk_id ?? null,
          nama_produk: it.nama_produk || 'Produk',
          size: it.size || null,
          quantity: Number(it.quantity || 1),
          price: Number(it.harga_satuan || 0)
        }))
        await supabaseAdmin.from('order_items').insert(toInsert)
      }
    }

    if (orderId) {
      const placeholderResi = 'Pesanan belum dikirim ke jasa kirim'
      const shouldCreateShipment =
        submission?.shipping_address &&
        (!existingResi || existingResi === placeholderResi || existingResi.length < 6)

      console.log('[Tripay] Paid callback processed', {
        submissionId: submission.id,
        orderId,
        existingResi,
        hasShippingAddress: !!submission?.shipping_address,
        shouldCreateShipment
      })

      if (shouldCreateShipment) {
        try {
          const shipment = await createBiteshipShipment({
            orderId,
            submission
          })

          if (shipment?.success) {
            const updates: Record<string, any> = {}
            if (shipment.waybill) {
              updates.shipping_resi = shipment.waybill
            }

            const baseAddress =
              (existingShippingAddress && typeof existingShippingAddress === 'object'
                ? existingShippingAddress
                : submission.shipping_address) || {}

            const biteshipMeta: Record<string, any> = {
              order_id: shipment.orderId || null,
              courier_code: shipment.courierCode || null,
              courier_service: shipment.courierService || null,
              tracking_url: shipment.trackingUrl || null,
              waybill: shipment.waybill || null
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
              .update(updates as any)
              .eq('id', orderId)
          } else if (shipment && !shipment.success) {
            console.warn('[Tripay] Biteship shipment failed:', shipment.message || shipment.raw)
          }
        } catch (err) {
          console.error('[Tripay] Failed to create Biteship shipment:', err)
        }
      } else {
        console.log('[Tripay] Skipping Biteship shipment', {
          submissionId: submission.id,
          orderId,
          reason: submission?.shipping_address
            ? existingResi
              ? `RESI_ALREADY_PRESENT: ${existingResi}`
              : 'RESI_LOOKS_VALID_BUT_CONDITION_FAILED'
            : 'NO_SHIPPING_ADDRESS'
        })
      }

      await sendInvoiceIfNeeded(orderId, submission)
    }
  }

  return { ok: true }
}
