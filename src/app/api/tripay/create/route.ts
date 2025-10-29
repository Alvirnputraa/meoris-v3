import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

type OrderItem = {
  sku?: string
  name: string
  price: number
  quantity: number
}

export async function POST(request: NextRequest) {
  try {
    const {
      merchantRef,
      amount,
      customer,
      items,
      method = 'QRIS',
      returnUrl
    }: {
      merchantRef: string
      amount: number
      customer: { name: string; email: string; phone?: string }
      items: OrderItem[]
      method?: string
      returnUrl?: string
    } = await request.json()

    if (!merchantRef || !amount || !customer?.name || !customer?.email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const API_BASE = 'https://tripay.co.id/api-sandbox'
    const API_KEY = process.env.TRIPAY_API_KEY
    const PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY
    const MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE

    if (!API_KEY || !PRIVATE_KEY || !MERCHANT_CODE) {
      return NextResponse.json({ error: 'Tripay credentials not configured' }, { status: 500 })
    }

    const signatureRaw = `${MERCHANT_CODE}${merchantRef}${Math.round(amount)}`
    const signature = crypto
      .createHmac('sha256', PRIVATE_KEY)
      .update(signatureRaw)
      .digest('hex')

    const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24h

    const body = {
      method,
      merchant_ref: merchantRef,
      amount: Math.round(amount),
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || '',
      order_items: (items || []).map((it) => ({
        sku: it.sku || '',
        name: it.name,
        price: Math.round(it.price),
        quantity: Number(it.quantity || 1)
      })),
      callback_url: process.env.TRIPAY_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/callback`,
      // Arahkan user kembali ke halaman pending spesifik submission (merchantRef)
      // Halaman pending sudah punya realtime redirect ke sukses/gagal.
      // Redirect back to resolver route; it will send user to success/failed/pending without flicker
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/${merchantRef}`,
      expired_time: expiredTime,
      signature
    }

    const res = await fetch(`${API_BASE}/transaction/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const json = await res.json().catch(() => null)

    if (!res.ok || !json) {
      return NextResponse.json({ error: 'Tripay request failed', details: json }, { status: 502 })
    }

    const data = json.data || {}
    const checkoutUrl = data.checkout_url || data.pay_url || data.payment_url || null

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Missing checkout_url from Tripay', raw: json }, { status: 502 })
    }

    return NextResponse.json({ success: true, checkout_url: checkoutUrl, reference: data.reference, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
