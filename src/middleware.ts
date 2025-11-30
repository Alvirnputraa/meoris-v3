import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for webhook/callback endpoints (no CSRF needed for external webhooks)
  if (pathname.startsWith('/api/callback') ||
      pathname.startsWith('/api/tripay/callback') ||
      pathname.startsWith('/api/biteship/webhook')) {
    return NextResponse.next()
  }

  // Check if URL is a payment route with dashes in orderId
  const paymentMatch = pathname.match(/^\/payment\/([a-f0-9-]+)\/(pending|succes|failed)$/)

  if (paymentMatch) {
    const [, orderId, status] = paymentMatch

    // If orderId contains dashes, redirect to URL without dashes
    if (orderId.includes('-')) {
      const cleanOrderId = orderId.replace(/-/g, '')
      const newUrl = new URL(`/payment/${cleanOrderId}/${status}`, request.url)
      return NextResponse.redirect(newUrl, 301) // Permanent redirect
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/payment/:orderId(.*)*',
    '/api/:path*',
  ],
}
