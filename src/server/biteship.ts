type CourierMapping = {
  courierCompany: string
  courierType: string
  label: string
}

const DEFAULT_ORIGIN = {
  contactName: process.env.BITESHIP_ORIGIN_CONTACT_NAME || 'Meoris Warehouse',
  contactPhone: process.env.BITESHIP_ORIGIN_CONTACT_PHONE || '081234567890',
  contactEmail: process.env.BITESHIP_ORIGIN_CONTACT_EMAIL || 'info@meoris.erdanpee.com',
  address:
    process.env.BITESHIP_ORIGIN_ADDRESS ||
    'Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat',
  note: process.env.BITESHIP_ORIGIN_NOTE || '',
  postalCode: process.env.BITESHIP_ORIGIN_POSTAL_CODE || '46151'
}

const DEFAULT_ITEM_DIMENSIONS = {
  length: Number(process.env.BITESHIP_DEFAULT_ITEM_LENGTH || 30), // cm (with box packaging)
  width: Number(process.env.BITESHIP_DEFAULT_ITEM_WIDTH || 20),   // cm (with box packaging)
  height: Number(process.env.BITESHIP_DEFAULT_ITEM_HEIGHT || 12), // cm (with box packaging)
  weight: Number(process.env.BITESHIP_DEFAULT_ITEM_WEIGHT || 700) // grams (sandal + packaging materials)
}

const DEFAULT_DELIVERY_TYPE = process.env.BITESHIP_DELIVERY_TYPE || 'now'

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return ''
  const digits = phone.toString().replace(/\D+/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('62')) return digits
  return `62${digits}`
}

function mapCourier(shippingMethod: string | null | undefined): CourierMapping | null {
  const method = (shippingMethod || '').toLowerCase()
  if (!method) return null
  if (method.includes('j&t')) {
    // J&T regular = courier_company jnt, courier_type ez
    return { courierCompany: 'jnt', courierType: 'ez', label: 'J&T Express' }
  }
  if (method.includes('jne')) {
    return { courierCompany: 'jne', courierType: 'reg', label: 'JNE' }
  }
  return null
}

function buildItems(items: any[]) {
  const result = []
  let totalWeight = 0

  for (const raw of items) {
    const qty = Math.max(1, Number(raw?.quantity || 1))
    const weight =
      Math.max(100, Number(raw?.weight || DEFAULT_ITEM_DIMENSIONS.weight || 500)) * qty
    totalWeight += weight
    result.push({
      name: raw?.nama_produk || raw?.name || 'Produk',
      description: raw?.deskripsi || raw?.description || '',
      value: Math.max(0, Number(raw?.harga_satuan || raw?.price || 0)),
      quantity: qty,
      weight,
      length: Number(raw?.length || DEFAULT_ITEM_DIMENSIONS.length),
      width: Number(raw?.width || DEFAULT_ITEM_DIMENSIONS.width),
      height: Number(raw?.height || DEFAULT_ITEM_DIMENSIONS.height)
    })
  }

  if (totalWeight <= 0) {
    totalWeight = DEFAULT_ITEM_DIMENSIONS.weight
  }

  return { items: result, totalWeight }
}

export interface CreateBiteshipShipmentParams {
  orderId: string
  submission: any
}

export interface BiteshipShipmentResult {
  success: boolean
  waybill?: string
  courierCode?: string
  courierService?: string
  trackingUrl?: string
  orderId?: string
  raw?: any
  message?: string
}

async function postBiteshipOrder(
  apiKey: string,
  payload: Record<string, any>
): Promise<{ ok: boolean; status: number; body: any }> {
  const resp = await fetch('https://api.biteship.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    cache: 'no-store'
  })
  let body: any = null
  try {
    body = await resp.json()
  } catch {
    body = null
  }
  return { ok: resp.ok, status: resp.status, body }
}

export async function createBiteshipShipment({
  orderId,
  submission
}: CreateBiteshipShipmentParams): Promise<BiteshipShipmentResult | null> {
  console.log('[Biteship] Attempting shipment creation', {
    orderId,
    submissionId: submission?.id,
    shippingMethod: submission?.shipping_method,
    shippingAddressProvided: !!submission?.shipping_address,
    totalItems: Array.isArray(submission?.items) ? submission.items.length : 0
  })

  const apiKey = process.env.BITESHIP_API_KEY
  if (!apiKey) {
    console.warn('[Biteship] Missing BITESHIP_API_KEY; skip shipment generation')
    return null
  }

  if (!submission) return null

  const courier = mapCourier(submission.shipping_method || submission.shipping_method_label)
  if (!courier) {
    console.info(
      '[Biteship] Unsupported shipping method, skip auto shipment:',
      submission?.shipping_method
    )
    return null
  }

  const dest = submission.shipping_address || {}
  const destAddress = (dest.alamat || dest.address || '').toString().trim()
  const destPostal = (dest.kode_pos || dest.postal_code || '').toString().trim()

  if (!destAddress || !destPostal) {
    console.warn('[Biteship] Destination address/postal missing; skip shipment', {
      address: destAddress,
      postal: destPostal
    })
    return null
  }

  const itemsArray = Array.isArray(submission.items) ? submission.items : []
  const { items, totalWeight } = buildItems(itemsArray)

  const amount = Number(submission.total || submission.total_amount || 0)
  const destinationName = dest.nama || `${dest.first_name || ''} ${dest.last_name || ''}`.trim() || 'Penerima'
  const destinationPhone = normalizePhone(dest.telepon || dest.phone)
  const destinationEmail = dest.email || submission.customer_email || ''
  const destinationNote = dest.catatan || dest.note || ''
  const destinationCity = dest.kota || dest.city || ''
  const destinationProvince = dest.provinsi || dest.province || ''
  const destinationDistrict = dest.kecamatan || dest.district || ''

  const basePayload: Record<string, any> = {
    reference_id: orderId,
    shipper_contact_name: DEFAULT_ORIGIN.contactName,
    shipper_contact_phone: normalizePhone(DEFAULT_ORIGIN.contactPhone),
    shipper_contact_email: DEFAULT_ORIGIN.contactEmail,
    origin_contact_name: DEFAULT_ORIGIN.contactName,
    origin_contact_phone: normalizePhone(DEFAULT_ORIGIN.contactPhone),
    origin_contact_email: DEFAULT_ORIGIN.contactEmail,
    origin_address: DEFAULT_ORIGIN.address,
    origin_note: DEFAULT_ORIGIN.note,
    origin_postal_code: DEFAULT_ORIGIN.postalCode,
    destination_contact_name: destinationName || 'Penerima',
    destination_contact_phone: destinationPhone,
    destination_contact_email: destinationEmail || undefined,
    destination_address: destAddress,
    destination_area: [
      destinationDistrict,
      destinationCity,
      destinationProvince
    ]
      .filter(Boolean)
      .join(', '),
    destination_postal_code: destPostal,
    destination_note: destinationNote,
    origin_collection_method:
      process.env.BITESHIP_ORIGIN_COLLECTION_METHOD || 'pickup',
    courier_company: courier.courierCompany,
    courier_type: courier.courierType,
    payment_type: 'prepaid',
    delivery_type: DEFAULT_DELIVERY_TYPE,
    items,
    parcel_weight: Math.max(totalWeight, DEFAULT_ITEM_DIMENSIONS.weight),
    parcel_height: DEFAULT_ITEM_DIMENSIONS.height,
    parcel_length: DEFAULT_ITEM_DIMENSIONS.length,
    parcel_width: DEFAULT_ITEM_DIMENSIONS.width,
    amount,
    requests: {
      courier: {
        use_insurance: false,
        cash_on_delivery: false
      }
    }
  }

  // Remove undefined optional fields
  Object.keys(basePayload).forEach((key) => {
    if (basePayload[key] === undefined || basePayload[key] === null) {
      delete basePayload[key]
    }
  })

  let result = await postBiteshipOrder(apiKey, basePayload)

  if (!result.ok) {
    const message =
      (result.body && (result.body.message || result.body.error || result.body.status)) ||
      `Failed with status ${result.status}`
    console.error('[Biteship] Failed to create shipment:', message, result.body || {})
    return {
      success: false,
      message,
      raw: result.body
    }
  }

  const body = result.body || {}
  const data = body.data || body
  const waybill =
    data.waybill_id ||
    data.courier?.waybill_id ||
    data.waybill ||
    data.tracking_number ||
    null

  console.log('[Biteship] Shipment created successfully', {
    orderId: data.id || data.order_id || orderId,
    waybill,
    courier: data.courier?.company || data.courier_code,
    service: data.courier?.service || data.courier_service_code,
    trackingUrl: data.courier?.tracking_url || data.tracking_url || data.url
  })

  return {
    success: true,
    waybill: waybill || undefined,
    courierCode: data.courier?.company || data.courier_company || courier.courierCompany,
    courierService: data.courier?.service || data.courier_type || courier.courierType,
    trackingUrl: data.courier?.tracking_url || data.tracking_url || data.url || undefined,
    orderId: data.id || data.order_id || undefined,
    raw: data
  }
}

/**
 * Create return shipment (REVERSE FLOW)
 * Origin = User address (pickup from customer)
 * Destination = Store address (Meoris warehouse)
 * Courier = JNT only
 */
export interface CreateReturnShipmentParams {
  returnId: string
  userAddress: {
    nama?: string
    telepon?: string
    email?: string
    alamat: string
    kota?: string
    provinsi?: string
    kecamatan?: string
    kode_pos: string
    catatan?: string
  }
  items: any[]
  orderAmount?: number
}

export async function createReturnShipment({
  returnId,
  userAddress,
  items,
  orderAmount = 0
}: CreateReturnShipmentParams): Promise<BiteshipShipmentResult | null> {
  console.log('[Biteship Return] Attempting return shipment creation', {
    returnId,
    userAddressProvided: !!userAddress,
    totalItems: Array.isArray(items) ? items.length : 0
  })

  const apiKey = process.env.BITESHIP_API_KEY
  if (!apiKey) {
    console.warn('[Biteship Return] Missing BITESHIP_API_KEY; skip return shipment generation')
    return null
  }

  // Validate user address
  const originAddress = (userAddress.alamat || '').toString().trim()
  const originPostal = (userAddress.kode_pos || '').toString().trim()

  if (!originAddress || !originPostal) {
    console.warn('[Biteship Return] User address/postal missing; skip return shipment', {
      address: originAddress,
      postal: originPostal
    })
    return null
  }

  // Build items
  const itemsArray = Array.isArray(items) ? items : []
  const { items: builtItems, totalWeight } = buildItems(itemsArray)

  // User info (origin/pickup)
  const originName = userAddress.nama || 'Pelanggan'
  const originPhone = normalizePhone(userAddress.telepon)
  const originEmail = userAddress.email || ''
  const originNote = userAddress.catatan || 'Pickup pengembalian barang'
  const originCity = userAddress.kota || ''
  const originProvince = userAddress.provinsi || ''
  const originDistrict = userAddress.kecamatan || ''

  // Force JNT for returns
  const jntCourier = { courierCompany: 'jnt', courierType: 'ez', label: 'J&T Express' }

  const returnPayload: Record<string, any> = {
    reference_id: `RETURN-${returnId}`,
    shipper_contact_name: originName,
    shipper_contact_phone: originPhone,
    shipper_contact_email: originEmail || undefined,
    origin_contact_name: originName,
    origin_contact_phone: originPhone,
    origin_contact_email: originEmail || undefined,
    origin_address: originAddress,
    origin_area: [originDistrict, originCity, originProvince].filter(Boolean).join(', '),
    origin_postal_code: originPostal,
    origin_note: originNote,
    destination_contact_name: DEFAULT_ORIGIN.contactName,
    destination_contact_phone: normalizePhone(DEFAULT_ORIGIN.contactPhone),
    destination_contact_email: DEFAULT_ORIGIN.contactEmail,
    destination_address: DEFAULT_ORIGIN.address,
    destination_postal_code: DEFAULT_ORIGIN.postalCode,
    destination_note: 'Return pengembalian barang dari pelanggan',
    origin_collection_method: 'pickup',
    courier_company: jntCourier.courierCompany,
    courier_type: jntCourier.courierType,
    payment_type: 'prepaid',
    delivery_type: DEFAULT_DELIVERY_TYPE,
    items: builtItems,
    parcel_weight: Math.max(totalWeight, DEFAULT_ITEM_DIMENSIONS.weight),
    parcel_height: DEFAULT_ITEM_DIMENSIONS.height,
    parcel_length: DEFAULT_ITEM_DIMENSIONS.length,
    parcel_width: DEFAULT_ITEM_DIMENSIONS.width,
    amount: orderAmount,
    requests: {
      courier: {
        use_insurance: false,
        cash_on_delivery: false
      }
    }
  }

  // Remove undefined optional fields
  Object.keys(returnPayload).forEach((key) => {
    if (returnPayload[key] === undefined || returnPayload[key] === null) {
      delete returnPayload[key]
    }
  })

  let result = await postBiteshipOrder(apiKey, returnPayload)

  if (!result.ok) {
    const message =
      (result.body && (result.body.message || result.body.error || result.body.status)) ||
      `Failed with status ${result.status}`
    console.error('[Biteship Return] Failed to create return shipment:', message, result.body || {})
    return {
      success: false,
      message,
      raw: result.body
    }
  }

  const body = result.body || {}
  const data = body.data || body
  const waybill =
    data.waybill_id ||
    data.courier?.waybill_id ||
    data.waybill ||
    data.tracking_number ||
    null

  console.log('[Biteship Return] Return shipment created successfully', {
    returnId,
    waybill,
    courier: data.courier?.company || data.courier_code,
    service: data.courier?.service || data.courier_service_code,
    trackingUrl: data.courier?.tracking_url || data.tracking_url || data.url
  })

  return {
    success: true,
    waybill: waybill || undefined,
    courierCode: data.courier?.company || data.courier_company || jntCourier.courierCompany,
    courierService: data.courier?.service || data.courier_type || jntCourier.courierType,
    trackingUrl: data.courier?.tracking_url || data.tracking_url || data.url || undefined,
    orderId: data.id || data.order_id || undefined,
    raw: data
  }
}
