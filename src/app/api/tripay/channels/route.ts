import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const API_BASE = 'https://tripay.co.id/api-sandbox'
    const API_KEY = process.env.TRIPAY_API_KEY
    if (!API_KEY) {
      return NextResponse.json({ error: 'Missing TRIPAY_API_KEY' }, { status: 500 })
    }

    const res = await fetch(`${API_BASE}/payment-channel`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    })
    const json = await res.json().catch(() => null)

    if (!res.ok || !json) {
      return NextResponse.json({ error: 'Failed to fetch channels', details: json }, { status: 502 })
    }

    return NextResponse.json(json)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

