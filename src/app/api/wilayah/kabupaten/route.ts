import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_BASE_URL = 'https://alamat.thecloudalert.com/api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const kodeProvinsi = searchParams.get('kode_provinsi')

    if (!kodeProvinsi) {
      return NextResponse.json({ error: 'kode_provinsi parameter is required' }, { status: 400 })
    }

    const response = await fetch(`${API_BASE_URL}/kabkota/get/?d_provinsi_id=${kodeProvinsi}`, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`)
    }

    const apiData = await response.json()

    // API returns data in 'result' field with 'id' and 'text' properties
    let rawData = []

    if (apiData.result && Array.isArray(apiData.result)) {
      rawData = apiData.result
    } else if (apiData.data && Array.isArray(apiData.data)) {
      rawData = apiData.data
    } else if (Array.isArray(apiData)) {
      rawData = apiData
    } else {
      console.error('Unexpected API response structure:', apiData)
      return NextResponse.json([])
    }

    // Transform API response to match existing format
    const data = rawData.map((item: any) => ({
      id: item.id || item.d_kabkota_id || item.kode,
      name: item.text || item.name || item.d_kabkota_nama || item.nama
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/wilayah/kabupaten:', error)
    return NextResponse.json({ error: 'Failed to load kabupaten data' }, { status: 500 })
  }
}
