import { NextRequest, NextResponse } from 'next/server'
import { processTripayCallback } from '@/server/tripay'

// Disable CSRF protection for webhook endpoint
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text()
    const signature = request.headers.get('x-callback-signature') || request.headers.get('X-Callback-Signature') || ''

    // Process the callback
    await processTripayCallback(raw, signature)

    // Return response with CORS headers
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-callback-signature, X-Callback-Signature',
      },
    })
  } catch (error: any) {
    console.error('Tripay callback error:', error)
    const status = (error?.status as number) || 500
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({ ok: true })
}

export async function OPTIONS() {
  // Handle preflight request
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-callback-signature, X-Callback-Signature',
    },
  })
}
