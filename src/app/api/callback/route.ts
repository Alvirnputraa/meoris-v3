import { NextRequest, NextResponse } from 'next/server'
import { processTripayCallback } from '@/server/tripay'

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text()
    const signature = request.headers.get('x-callback-signature') || request.headers.get('X-Callback-Signature') || ''
    await processTripayCallback(raw, signature)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = (error?.status as number) || 500
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}

