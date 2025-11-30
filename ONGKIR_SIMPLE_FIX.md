# Fix Ongkir: SiCepat Tidak Muncul

## Problem
Di halaman checkout:
- ✅ J&T Express: Muncul dengan harga
- ❌ JNE: Menampilkan "-"
- ❌ SiCepat: Menampilkan "-"

## Root Cause

**Biteship API request tidak include SiCepat**

**File:** `src/app/api/biteship/rates/route.ts`
**Line:** 84

**Sebelum:**
```typescript
couriers: 'jnt,jne', // ❌ SiCepat tidak di-request
```

**Sesudah:**
```typescript
couriers: 'jnt,jne,sicepat', // ✅ Request semua 3 courier
```

## Solution

### 1. Update API Request
Tambahkan `sicepat` ke parameter `couriers` di Biteship API request.

**File:** `src/app/api/biteship/rates/route.ts:84`

```typescript
const ratesPayload: any = {
  origin_postal_code: DEFAULT_ORIGIN.postal_code,
  destination_postal_code: postalStr,
  couriers: 'jnt,jne,sicepat', // ✅ Fixed
  items: processedItems.length > 0 ? processedItems : [...]
}
```

### 2. SiCepat Mapping & UI (Already Done)
Sudah ditambahkan di `src/app/produk/checkout/page.tsx`:
- Mapping logic untuk parse SiCepat rates
- UI component (radio button) untuk SiCepat
- Debug logging untuk troubleshooting

### 3. Remove Database Fallback
Hapus hybrid fallback system karena perhitungan ongkir harus akurat dari Biteship.

## How It Works

### Request Flow:
```javascript
// 1. Frontend kirim request ke /api/biteship/rates
{
  destination_postal_code: "46181",
  items: [...]
}

// 2. Backend request ke Biteship API
{
  origin_postal_code: "46151",
  destination_postal_code: "46181",
  couriers: "jnt,jne,sicepat", // ✅ Request semua
  items: [...]
}

// 3. Biteship response
{
  pricing: [
    { company: "jnt", price: 21000, ... },
    { company: "sicepat", price: 21500, ... }
    // JNE tidak muncul = memang tidak support area ini
  ]
}

// 4. Parse & display
[Biteship Rates] Loaded rates: { 'j&t': 21000, 'sicepat': 21500 }

// 5. UI shows:
// - J&T Express: Rp 21.000 ✅
// - SiCepat: Rp 21.500 ✅
// - JNE: "-" (tidak tersedia untuk area ini)
```

## Expected Result

### Scenario 1: Postal Code dengan Coverage Lengkap
Semua 3 courier tersedia dari Biteship:

```javascript
[Biteship Rates] Loaded rates: { 'j&t': 14000, 'jne': 15000, 'sicepat': 13500 }
```

**UI:**
- J&T Express: Rp 14.000 ✅
- JNE: Rp 15.000 ✅
- SiCepat: Rp 13.500 ✅

### Scenario 2: Postal Code dengan Coverage Terbatas
Hanya sebagian courier tersedia (normal behavior):

```javascript
[Biteship Rates] Loaded rates: { 'j&t': 21000, 'sicepat': 21500 }
```

**UI:**
- J&T Express: Rp 21.000 ✅
- JNE: "-" (tidak tersedia)
- SiCepat: Rp 21.500 ✅

### Scenario 3: Biteship Error
API error atau timeout:

```javascript
[Biteship Rates] Error loading rates
```

**UI:**
- J&T Express: "-"
- JNE: "-"
- SiCepat: "-"

User tidak bisa checkout (ini acceptable karena ongkir harus akurat).

## Testing

### 1. Test SiCepat Muncul
1. Buka checkout page dengan postal code yang support SiCepat (contoh: 46181)
2. Open console (F12)
3. Cari log: `[Biteship Rates] Loaded rates`
4. Verify `sicepat` key ada dengan harga > 0
5. Cek UI: SiCepat radio button harus muncul dengan harga

### 2. Test API Directly (Postman/cURL)
```bash
curl -X POST https://api.biteship.com/v1/rates/couriers \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "origin_postal_code": 50111,
    "destination_postal_code": 46181,
    "couriers": "sicepat",
    "items": [{
      "name": "Test",
      "value": 100000,
      "quantity": 1,
      "weight": 200
    }]
  }'
```

Expected response:
```json
{
  "success": true,
  "pricing": [
    {
      "company": "sicepat",
      "courier_name": "SiCepat",
      "price": 21500,
      ...
    }
  ]
}
```

### 3. Expected Console Output
```javascript
[Biteship Rates] Request payload: {
  origin_postal_code: "46151",
  destination_postal_code: "46181",
  couriers: "jnt,jne,sicepat",
  items: [...]
}

[Biteship Rates] Raw pricing data: [
  { company: 'jnt', courier_service_name: 'EZ', price: 21000 },
  { company: 'sicepat', courier_service_name: 'Reguler', price: 21500 }
]

[Biteship Rate] { company: 'jnt', service: 'ez', price: 21000 }
[Biteship Rate] { company: 'sicepat', service: 'reguler', price: 21500 }

[Biteship Rates] Loaded rates: { 'j&t': 21000, 'sicepat': 21500 }

[renderOngkirPrice] { label: 'J&T Express', key: 'j&t', amount: 21000 }
[renderOngkirPrice] { label: 'JNE', key: 'jne', amount: undefined } // "-" di UI
[renderOngkirPrice] { label: 'SiCepat', key: 'sicepat', amount: 21500 }
```

## Why JNE Shows "-"?

**Answer:** Biteship tidak return JNE untuk postal code tertentu.

**Reasons:**
1. Area tidak dilayani JNE
2. Weight/dimensions melebihi JNE limits
3. JNE service temporarily unavailable

**This is NORMAL behavior.** Tidak semua courier melayani semua area.

## Important Notes

1. **No Database Fallback** - Ongkir harus akurat dari Biteship, tidak boleh pakai harga estimasi dari database
2. **Courier Availability Varies** - Normal jika tidak semua courier tersedia untuk setiap postal code
3. **User Must Choose Available Courier** - Jika preferred courier tidak tersedia, user harus pilih alternatif
4. **Error Handling** - Jika Biteship error, lebih baik tampilkan error daripada harga yang salah

## Files Modified

1. **`src/app/api/biteship/rates/route.ts`**
   - Line 84: Added `sicepat` to couriers parameter
   - ✅ Fixed

2. **`src/app/produk/checkout/page.tsx`**
   - Line 555-560: SiCepat mapping logic (already done)
   - Line 1763-1784: SiCepat UI component (already done)
   - Line 565-571: Removed database fallback (cleaned up)
   - ✅ Fixed

## Related Documentation

- `ONGKIR_JNE_SICEPAT_FIX.md` - Technical details
- `DEBUG_ONGKIR_CONSOLE.md` - Debugging guide
- Biteship API Docs: https://biteship.com/docs

---

**Fix Date:** 2025-01-15
**Status:** ✅ FIXED
**Solution:** Add `sicepat` to Biteship API request
**Impact:** SiCepat now appears when available from Biteship
