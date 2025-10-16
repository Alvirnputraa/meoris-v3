import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { waybill, courier } = await req.json()
    const apiKey = process.env.BITESHIP_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing BITESHIP_API_KEY' }, { status: 500 })
    }
    if (!waybill || !courier) {
      return NextResponse.json({ error: 'Missing waybill or courier' }, { status: 400 })
    }

    const url = `https://api.biteship.com/v1/trackings/${encodeURIComponent(waybill)}?courier=${encodeURIComponent(courier)}`
    let resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      // 10s timeout guard via AbortController if needed (skipped here for brevity)
    })
    let data = await resp.json().catch(() => ({}))
    // Some waybills must be registered first
    if (!resp.ok && (resp.status === 400 || resp.status === 404)) {
      const createResp = await fetch('https://api.biteship.com/v1/trackings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ waybill_id: waybill, courier_code: courier })
      })
      // Ignore errors on create; try GET again regardless
      await createResp.json().catch(() => ({}))
      resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      data = await resp.json().catch(() => ({}))
    }
    if (!resp.ok) {
      const msg = (data && (data.message || data.error || data.status)) || 'Failed to retrieve tracking number'
      return NextResponse.json({ error: msg }, { status: resp.status || 500 })
    }
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}
