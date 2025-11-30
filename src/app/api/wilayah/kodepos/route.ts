import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_BASE_URL = 'https://alamat.thecloudalert.com/api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const kodeKabupaten = searchParams.get('kode_kabupaten')
    const kodeKecamatan = searchParams.get('kode_kecamatan')
    const kodeProvinsi = searchParams.get('kode_provinsi')

    if (!kodeKabupaten || !kodeKecamatan) {
      return NextResponse.json({ error: 'kode_kabupaten and kode_kecamatan parameters are required' }, { status: 400 })
    }

    const response = await fetch(`${API_BASE_URL}/kodepos/get/?d_provinsi_id=${kodeProvinsi || ''}&d_kabkota_id=${kodeKabupaten}&d_kecamatan_id=${kodeKecamatan}`, {
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
      id: item.id || item.kode_id,
      code: item.text || item.kodepos || item.postal_code,
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/wilayah/kodepos:', error)
    return NextResponse.json({ error: 'Failed to load postal code data' }, { status: 500 })
  }
}
