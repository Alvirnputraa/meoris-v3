import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ waybillId: string }> }
) {
  try {
    // Await params untuk Next.js 15+
    const resolvedParams = await params
    const waybillId = resolvedParams.waybillId

    console.log('📦 Tracking request for waybill:', waybillId)

    if (!waybillId || waybillId === 'undefined' || waybillId === 'null') {
      console.error('❌ Invalid waybill ID:', waybillId)
      return NextResponse.json(
        { error: 'Waybill ID is required' },
        { status: 400 }
      )
    }

    const biteshipApiKey = process.env.BITESHIP_API_KEY

    if (!biteshipApiKey) {
      console.error('BITESHIP_API_KEY not configured')
      return NextResponse.json(
        { error: 'Tracking service not configured' },
        { status: 500 }
      )
    }

    console.log('Fetching tracking for waybill:', waybillId)

    // Detect if it's Biteship Order ID (starts with WYB-)
    const isBiteshipOrderId = waybillId.startsWith('WYB-')

    // Untuk Biteship Order ID, kita perlu tahu courier code
    // Kita coba beberapa courier populer (urutan dari paling sering dipakai)
    const courierCodes = ['jne', 'sicepat', 'jnt', 'anteraja', 'ninja', 'idexpress', 'grab', 'gosend', 'lion', 'sap', 'wahana']

    let trackingData = null
    let lastError = null

    if (isBiteshipOrderId) {
      console.log('📦 Biteship Order ID detected, trying multiple couriers...')

      // Try each courier until we find one that works
      for (const courier of courierCodes) {
        try {
          const apiUrl = `https://api.biteship.com/v1/trackings/${waybillId}/couriers/${courier}`
          console.log(`Trying: ${apiUrl}`)

          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': biteshipApiKey,
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            trackingData = await response.json()
            console.log(`✅ Found tracking data with courier: ${courier}`)
            break
          } else {
            console.log(`❌ ${courier}: ${response.status}`)
            lastError = { status: response.status, statusText: response.statusText }
          }
        } catch (error) {
          console.log(`❌ ${courier} error:`, error)
          lastError = error
        }
      }

      // If no courier worked, return 404
      if (!trackingData) {
        console.error('No tracking data found for any courier')
        return NextResponse.json(
          {
            error: 'Tracking not found',
            message: 'Nomor resi belum tersedia di sistem tracking. Silakan coba beberapa saat lagi.'
          },
          { status: 404 }
        )
      }
    } else {
      // Regular waybill tracking
      const apiUrl = `https://api.biteship.com/v1/trackings/${waybillId}`
      console.log('API URL:', apiUrl)

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': biteshipApiKey,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Biteship API error:', response.status, response.statusText)

        // Kalau 404, waybill belum ada di sistem
        if (response.status === 404) {
          return NextResponse.json(
            {
              error: 'Tracking not found',
              message: 'Nomor resi belum tersedia di sistem tracking. Silakan coba beberapa saat lagi.'
            },
            { status: 404 }
          )
        }

        return NextResponse.json(
          { error: 'Failed to fetch tracking data' },
          { status: response.status }
        )
      }

      trackingData = await response.json()
    }

    console.log('✅ Tracking data fetched successfully')

    // Response from Biteship is already in good format
    // Just return it directly
    return NextResponse.json({
      success: true,
      data: trackingData
    })

  } catch (error) {
    console.error('Tracking API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
