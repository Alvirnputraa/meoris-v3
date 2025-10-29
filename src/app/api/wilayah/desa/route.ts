import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_BASE_URL = 'https://alamat.thecloudalert.com/api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const kodeKecamatan = searchParams.get('kode_kecamatan')

    if (!kodeKecamatan) {
      return NextResponse.json({ error: 'kode_kecamatan parameter is required' }, { status: 400 })
    }

    // Fetch kelurahan/desa data
    const kelurahanResponse = await fetch(`${API_BASE_URL}/kelurahan/get/?d_kecamatan_id=${kodeKecamatan}`, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!kelurahanResponse.ok) {
      throw new Error(`API returned status ${kelurahanResponse.status}`)
    }

    const kelurahanApiData = await kelurahanResponse.json()

    // API returns data in 'result' field with 'id' and 'text' properties
    let kelurahanData = []

    if (kelurahanApiData.result && Array.isArray(kelurahanApiData.result)) {
      kelurahanData = kelurahanApiData.result
    } else if (kelurahanApiData.data && Array.isArray(kelurahanApiData.data)) {
      kelurahanData = kelurahanApiData.data
    } else if (Array.isArray(kelurahanApiData)) {
      kelurahanData = kelurahanApiData
    } else {
      console.error('Unexpected API response structure:', kelurahanApiData)
      return NextResponse.json([])
    }

    // Transform API response to match existing format
    // Note: postal codes are now fetched separately per kecamatan, not per kelurahan
    const data = kelurahanData.map((item: any) => {
      const kelurahanId = item.id || item.d_kelurahan_id || item.kode
      return {
        id: kelurahanId,
        name: item.text || item.name || item.d_kelurahan_nama || item.nama,
        postalCode: '' // Postal code will be selected separately
      }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/wilayah/desa:', error)
    return NextResponse.json({ error: 'Failed to load desa data' }, { status: 500 })
  }
}
