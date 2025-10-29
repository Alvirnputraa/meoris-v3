import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_ORIGIN = {
  latitude: -7.3267,
  longitude: 108.2177,
  postal_code: '46151' // Tasikmalaya
}

const DEFAULT_ITEM_DIMENSIONS = {
  length: 30,  // cm (increased for box packaging)
  width: 20,   // cm (increased for box packaging)
  height: 12,  // cm (increased for box packaging)
  weight: 700  // grams (sandal + box + bubble wrap + plastic)
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.BITESHIP_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Biteship API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { destination_postal_code, items = [], destination_area_id } = body

    if (!destination_postal_code) {
      return NextResponse.json(
        { success: false, error: 'destination_postal_code is required' },
        { status: 400 }
      )
    }

    // Calculate total weight from items
    let totalWeight = 0
    const processedItems = []

    for (const item of items) {
      const qty = Math.max(1, Number(item?.quantity || 1))
      const weight = Math.max(100, Number(item?.weight || DEFAULT_ITEM_DIMENSIONS.weight)) * qty
      totalWeight += weight

      processedItems.push({
        name: item?.nama_produk || item?.name || 'Produk',
        description: item?.deskripsi || item?.description || '',
        value: Math.max(0, Number(item?.harga_satuan || item?.price || 0)),
        quantity: qty,
        weight,
        length: Number(item?.length || DEFAULT_ITEM_DIMENSIONS.length),
        width: Number(item?.width || DEFAULT_ITEM_DIMENSIONS.width),
        height: Number(item?.height || DEFAULT_ITEM_DIMENSIONS.height)
      })
    }

    if (totalWeight <= 0) {
      totalWeight = DEFAULT_ITEM_DIMENSIONS.weight
    }

    // Build Biteship rates request
    const ratesPayload: any = {
      origin_postal_code: DEFAULT_ORIGIN.postal_code,
      destination_postal_code: destination_postal_code,
      couriers: 'jnt,jne', // J&T and JNE
      items: processedItems.length > 0 ? processedItems : [
        {
          name: 'Produk',
          description: '',
          value: 0,
          quantity: 1,
          weight: totalWeight,
          length: DEFAULT_ITEM_DIMENSIONS.length,
          width: DEFAULT_ITEM_DIMENSIONS.width,
          height: DEFAULT_ITEM_DIMENSIONS.height
        }
      ]
    }

    // Optional: add area_id if available
    if (destination_area_id) {
      ratesPayload.destination_area_id = destination_area_id
    }

    console.log('[Biteship Rates] Request payload:', JSON.stringify(ratesPayload, null, 2))

    const response = await fetch('https://api.biteship.com/v1/rates/couriers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ratesPayload),
      cache: 'no-store'
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[Biteship Rates] Error:', result)
      return NextResponse.json(
        {
          success: false,
          error: result.error || result.message || 'Failed to get rates',
          details: result
        },
        { status: response.status }
      )
    }

    console.log('[Biteship Rates] Success:', {
      pricingCount: result.pricing?.length || 0,
      origin: result.origin,
      destination: result.destination
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('[Biteship Rates] Exception:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
