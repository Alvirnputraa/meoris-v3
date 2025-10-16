# Fix Ongkir Rp 0 - Dynamic Shipping Cost by Ekspedisi

## Problem
Ongkir menampilkan Rp 0 di halaman checkout padahal di database sudah ada data:
- J&T: Rp 14.000
- JNE: Rp 16.000

## Root Cause
1. Tabel `ongkir` memiliki kolom `ekspedisi` yang membedakan ongkir per ekspedisi
2. Kode sebelumnya tidak memfilter berdasarkan ekspedisi yang dipilih
3. Query menggunakan `.single()` yang error ketika ada multiple rows

## Solution

### 1. Update Database Functions (`/app/src/lib/database.ts`)

**Before:**
```typescript
export const ongkirDb = {
  async get() {
    const { data, error } = await supabase
      .from('ongkir')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()  // ❌ Error jika ada multiple rows
    // ...
  }
}
```

**After:**
```typescript
export const ongkirDb = {
  // Get ongkir by ekspedisi name
  async getByEkspedisi(ekspedisi: string) {
    const { data, error } = await supabase
      .from('ongkir')
      .select('*')
      .ilike('ekspedisi', ekspedisi)  // ✅ Filter by ekspedisi
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    return data
  },

  // Get all ongkir records
  async getAll() {
    const { data, error } = await supabase
      .from('ongkir')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}
```

### 2. Update Checkout Page (`/app/src/app/produk/checkout/page.tsx`)

#### a. Add Shipping Selection State

```typescript
const [selectedShipping, setSelectedShipping] = useState<string>('J&T Express')
```

#### b. Update useEffect to Load Ongkir by Ekspedisi

**Before:**
```typescript
useEffect(() => {
  const loadOngkir = async () => {
    setOngkirLoading(true)
    try {
      const data = await ongkirDb.get()  // ❌ No filter
      if (data && data.ongkir) {
        setOngkirAmount(Number(data.ongkir))
      }
    } catch (error) {
      console.error('Error loading ongkir:', error)
      setOngkirAmount(0)
    } finally {
      setOngkirLoading(false)
    }
  }

  loadOngkir()
}, [])
```

**After:**
```typescript
useEffect(() => {
  const loadOngkir = async () => {
    if (!selectedShipping) return
    
    setOngkirLoading(true)
    try {
      // Map ekspedisi name - hapus " Express" dari nama
      const ekspedisiName = selectedShipping.replace(' Express', '').trim()
      const data = await ongkirDb.getByEkspedisi(ekspedisiName)  // ✅ Filter by ekspedisi
      if (data && data.ongkir) {
        setOngkirAmount(Number(data.ongkir))
      }
    } catch (error) {
      console.error('Error loading ongkir:', error)
      setOngkirAmount(0)
    } finally {
      setOngkirLoading(false)
    }
  }

  loadOngkir()
}, [selectedShipping])  // ✅ Re-load when ekspedisi changes
```

#### c. Update Radio Buttons to Track Selection

**Before:**
```tsx
<input 
  type="radio" 
  name="shipping_method" 
  value="J&T Express" 
  className="w-4 h-4 accent-black" 
  defaultChecked 
/>
```

**After:**
```tsx
<input 
  type="radio" 
  name="shipping_method" 
  value="J&T Express" 
  className="w-4 h-4 accent-black" 
  checked={selectedShipping === 'J&T Express'}  // ✅ Controlled
  onChange={(e) => setSelectedShipping(e.target.value)}  // ✅ Track changes
/>
```

#### d. Update Display Logic

**Before:**
```tsx
{ongkirLoading ? (
  <span>Loading...</span>
) : (
  <span>Rp {ongkirAmount.toLocaleString('id-ID')}</span>
)}
```

**After:**
```tsx
{ongkirLoading && selectedShipping === 'J&T Express' ? (
  <span className="font-body text-xs text-gray-500">Loading...</span>
) : selectedShipping === 'J&T Express' ? (
  <span className="font-body text-xs font-medium text-black">
    Rp {ongkirAmount.toLocaleString('id-ID')}
  </span>
) : (
  <span className="font-body text-xs text-gray-500">-</span>
)}
```

## How It Works Now

1. **Default State**: J&T Express terpilih secara default
2. **Auto-Load**: Saat halaman dimuat, fetch ongkir untuk J&T (Rp 14.000)
3. **User Switches**: Ketika user klik JNE, `selectedShipping` berubah
4. **Re-fetch**: useEffect trigger, fetch ongkir untuk JNE (Rp 16.000)
5. **Update UI**: Total pesanan otomatis update dengan ongkir baru

## Database Structure

```sql
CREATE TABLE public.ongkir (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ongkir numeric DEFAULT '140000'::numeric,
  ekspedisi character varying,  -- 'J&T', 'JNE'
  CONSTRAINT ongkir_pkey PRIMARY KEY (id)
);

-- Sample Data
INSERT INTO ongkir (ongkir, ekspedisi) VALUES (14000, 'J&T');
INSERT INTO ongkir (ongkir, ekspedisi) VALUES (16000, 'JNE');
```

## Expected Behavior

### When J&T Express Selected:
- Card J&T: **Rp 14.000** ✅
- Card JNE: **-** (grey dash)
- Biaya Jasa Kirim: **Rp 14.000**
- Total: Subtotal + 14.000

### When JNE Selected:
- Card J&T: **-** (grey dash)
- Card JNE: **Rp 16.000** ✅
- Biaya Jasa Kirim: **Rp 16.000**
- Total: Subtotal + 16.000

## Testing Steps

1. Login ke aplikasi
2. Buka halaman checkout dengan pra_checkout_id yang valid
3. Verifikasi J&T Express selected by default
4. Cek console browser untuk error (seharusnya tidak ada)
5. Verifikasi ongkir J&T muncul: **Rp 14.000**
6. Click radio button JNE
7. Verifikasi ongkir berubah menjadi: **Rp 16.000**
8. Cek Ringkasan Pesanan - Biaya Jasa Kirim juga ikut berubah
9. Cek Total - sudah include ongkir yang sesuai

## Common Issues & Solutions

### Issue: Still showing Rp 0
**Solution:**
1. Cek console browser untuk error
2. Pastikan data ada di tabel ongkir dengan kolom ekspedisi
3. Verifikasi nama ekspedisi di database: harus 'J&T' atau 'JNE' (tanpa 'Express')

### Issue: Error "no rows returned"
**Solution:**
```sql
-- Pastikan data ada
SELECT * FROM ongkir WHERE ekspedisi ILIKE 'J&T';
SELECT * FROM ongkir WHERE ekspedisi ILIKE 'JNE';

-- Jika tidak ada, insert
INSERT INTO ongkir (ongkir, ekspedisi) VALUES (14000, 'J&T');
INSERT INTO ongkir (ongkir, ekspedisi) VALUES (16000, 'JNE');
```

### Issue: Ongkir tidak update saat ganti ekspedisi
**Solution:**
1. Cek apakah radio button memiliki `onChange` handler
2. Verifikasi `selectedShipping` state berubah (gunakan React DevTools)
3. Cek useEffect dependency array: `[selectedShipping]`

## Name Mapping

Kode melakukan mapping otomatis:
- `"J&T Express"` (UI) → `"J&T"` (Database query)
- `"JNE"` (UI) → `"JNE"` (Database query)

Ini dilakukan dengan:
```typescript
const ekspedisiName = selectedShipping.replace(' Express', '').trim()
```

## Files Changed

1. `/app/src/lib/database.ts`
   - Added `getByEkspedisi()` function
   - Updated `ongkirDb` export

2. `/app/src/app/produk/checkout/page.tsx`
   - Added `selectedShipping` state
   - Updated `useEffect` for ongkir loading
   - Updated radio buttons with controlled state
   - Updated display logic for conditional rendering

## Performance Note

- Ongkir di-fetch setiap kali ekspedisi berubah
- Query menggunakan index pada kolom `ekspedisi` (jika ada)
- Response cepat karena hanya 1 row yang diambil

## Future Improvements

1. **Cache ongkir data**: Fetch semua ongkir sekali, store di state
2. **Validation**: Pastikan ekspedisi yang dipilih ada di database
3. **Fallback**: Tampilkan "Hubungi CS" jika ongkir tidak tersedia
4. **Dynamic ekspedisi list**: Ambil list ekspedisi dari database
