import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_BASE_URL = 'https://alamat.thecloudalert.com/api'

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/provinsi/get/`, {
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
      id: item.id || item.d_provinsi_id || item.kode,
      name: item.text || item.name || item.d_provinsi_nama || item.nama
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/wilayah/provinsi:', error)
    return NextResponse.json({ error: 'Failed to load provinsi data' }, { status: 500 })
  }
}
