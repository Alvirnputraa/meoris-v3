import { NextRequest, NextResponse } from 'next/server'
import { createBiteshipShipment } from '@/server/biteship'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      orderId = `TEST-${Date.now()}`,
      shipping_method = 'JNE',
      shipping_address = {},
      items = [],
      total = 0
    } = body || {}

    const submission = {
      id: orderId,
      shipping_method,
      shipping_address,
      items,
      total
    }

    const result = await createBiteshipShipment({
      orderId,
      submission
    })

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Shipment helper returned null (likely missing API key or unsupported shipping method)'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, shipment: result })
  } catch (error: any) {
    console.error('[Biteship Test API] Error:', error)
    return NextResponse.json(
      { ok: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
