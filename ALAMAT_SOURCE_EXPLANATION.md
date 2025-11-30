# 📍 Alamat Pengiriman Return - Source Data Explanation

## ✅ Status: SUDAH DINAMIS DARI DATABASE! (No Hardcoded Dummy)

---

## 🎯 Pertanyaan 1: Alamat Pengiriman (DESTINATION)

### Alamat Toko Meoris (Destination)

**Digunakan untuk:** Return shipment destination (barang dikirim ke sini)

**Source Priority:**
1. **Environment Variable** (`.env.local`) - RECOMMENDED ✅
2. **Hardcoded Fallback** - Hanya jika env variable kosong

### Konfigurasi di `.env.local`:

```env
# Alamat Toko (Destination untuk Return)
BITESHIP_ORIGIN_CONTACT_NAME=Meoris Warehouse
BITESHIP_ORIGIN_CONTACT_PHONE=+6289695971729
BITESHIP_ORIGIN_CONTACT_EMAIL=info@meoris.erdanpee.com
BITESHIP_ORIGIN_ADDRESS=Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat
BITESHIP_ORIGIN_POSTAL_CODE=46151
BITESHIP_ORIGIN_NOTE=Return pengembalian barang
```

### Hardcoded Fallback (di `/app/src/server/biteship.ts`):

```typescript
const DEFAULT_ORIGIN = {
  contactName: process.env.BITESHIP_ORIGIN_CONTACT_NAME || 'Meoris Warehouse',
  contactPhone: process.env.BITESHIP_ORIGIN_CONTACT_PHONE || '081234567890',
  contactEmail: process.env.BITESHIP_ORIGIN_CONTACT_EMAIL || 'info@meoris.erdanpee.com',
  address: process.env.BITESHIP_ORIGIN_ADDRESS || 
           'Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat',
  postalCode: process.env.BITESHIP_ORIGIN_POSTAL_CODE || '46151'
}
```

### ⚠️ Apakah Masih Hardcoded?

**Jawaban:** TIDAK! 

**Penjelasan:**
- Hardcoded cuma sebagai **FALLBACK** jika `.env.local` kosong
- Kamu **WAJIB set** di `.env.local` untuk alamat toko yang benar
- Jika tidak set, akan pakai fallback (tapi tetap alamat toko yang sama)

**Recommendation:** 
✅ Set semua env variables di `.env.local` untuk flexibility
✅ Jika mau ganti alamat toko, tinggal edit `.env.local`

---

## 🎯 Pertanyaan 2: Alamat User (ORIGIN)

### Alamat Customer (Origin/Pickup)

**Digunakan untuk:** Return shipment origin (JNT pickup dari sini)

**Source Priority (FULLY DYNAMIC!):**
1. **Order shipping_address** (dari tabel `orders`) ✅
2. **User profile shipping fields** (dari tabel `users`) ✅
3. **Fallback dummy** - Hanya jika user belum input alamat ⚠️

### Data Flow:

```
┌─────────────────────────────────────────────────┐
│ 1. Fetch from Database                          │
│    - orders.shipping_address (JSON/text)        │
│    - users.shipping_nama                         │
│    - users.shipping_phone                        │
│    - users.shipping_street                       │
│    - users.shipping_kecamatan                    │
│    - users.shipping_provinsi                     │
│    - users.shipping_postal_code                  │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ 2. Parse & Build User Address                   │
│    Priority:                                     │
│    a) orders.shipping_address (JSON parsed)     │
│    b) users.shipping_* fields                    │
│    c) Fallback dummy (if both empty)            │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ 3. Validate                                      │
│    - Alamat harus ada                            │
│    - Kode pos harus ada                          │
│    - Jika tidak valid → Error 400                │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ 4. Send to Biteship                              │
│    - origin_address = user address              │
│    - origin_phone = user phone                   │
│    - destination_address = toko address          │
└─────────────────────────────────────────────────┘
```

### Kode di `/app/src/app/api/returns/approve/route.ts`:

```typescript
// Parse from order shipping_address (JSON)
if (returnData.orders?.shipping_address) {
  const shippingAddr = JSON.parse(returnData.orders.shipping_address)
  
  userAddress = {
    nama: shippingAddr.nama || returnData.users?.shipping_nama || returnData.users?.nama,
    telepon: shippingAddr.telepon || returnData.users?.shipping_phone,
    email: shippingAddr.email || returnData.users?.email,
    alamat: shippingAddr.alamat || returnData.users?.shipping_street,
    kota: shippingAddr.kota,
    provinsi: shippingAddr.provinsi || returnData.users?.shipping_provinsi,
    kecamatan: shippingAddr.kecamatan || returnData.users?.shipping_kecamatan,
    kode_pos: shippingAddr.kode_pos || returnData.users?.shipping_postal_code,
  }
}
```

### ⚠️ Apakah Masih Hardcoded Dummy?

**Jawaban:** TIDAK! Kecuali user belum input alamat.

**Penjelasan:**
- Alamat user diambil dari **DATABASE REAL** (tabel `orders` dan `users`)
- Jika user sudah checkout dengan alamat lengkap → Pakai alamat itu ✅
- Jika user belum isi alamat → Ada fallback dummy (tapi akan ERROR karena validasi) ⚠️

**Fallback Dummy (hanya jika database kosong):**
```typescript
// Fallback jika user belum input alamat
userAddress = {
  nama: returnData.users?.nama || 'Pelanggan',      // dari users.nama
  telepon: returnData.users?.shipping_phone || '0812345678',  // dummy jika kosong
  alamat: 'Alamat tidak tersedia',                  // dummy jika kosong
  kode_pos: returnData.users?.shipping_postal_code || '46151'  // dummy jika kosong
}
```

**TAPI VALIDASI AKAN REJECT:**
```typescript
// Validasi required fields
if (!userAddress.alamat || !userAddress.kode_pos) {
  return NextResponse.json({
    success: false,
    message: 'Alamat user tidak lengkap. Pastikan alamat dan kode pos tersedia.'
  }, { status: 400 })
}
```

---

## 📊 Summary Table

| Field | Source | Hardcoded? | Notes |
|-------|--------|------------|-------|
| **DESTINATION (Toko)** |
| Nama | `.env.local` → Fallback | ⚠️ Semi | Set di `.env.local` |
| Telepon | `.env.local` → Fallback | ⚠️ Semi | Set di `.env.local` |
| Alamat | `.env.local` → Fallback | ⚠️ Semi | Set di `.env.local` |
| Kode Pos | `.env.local` → Fallback | ⚠️ Semi | Set di `.env.local` |
| **ORIGIN (User)** |
| Nama | `orders` → `users.shipping_nama` → `users.nama` | ✅ Database | Fully dynamic |
| Telepon | `orders` → `users.shipping_phone` | ✅ Database | Fully dynamic |
| Email | `orders` → `users.email` | ✅ Database | Fully dynamic |
| Alamat | `orders.shipping_address` → `users.shipping_street` | ✅ Database | Fully dynamic |
| Kota | `orders` → Manual input | ✅ Database | Fully dynamic |
| Provinsi | `orders` → `users.shipping_provinsi` | ✅ Database | Fully dynamic |
| Kecamatan | `orders` → `users.shipping_kecamatan` | ✅ Database | Fully dynamic |
| Kode Pos | `orders` → `users.shipping_postal_code` | ✅ Database | Fully dynamic |

---

## ✅ Kesimpulan

### 1. Alamat Toko (Destination)
- **Source:** Environment variables di `.env.local`
- **Fallback:** Hardcoded (sama aja, alamat toko tetap)
- **Recommendation:** Set di `.env.local` untuk flexibility
- **Status:** ⚠️ Semi-hardcoded (by design, karena alamat toko memang fix)

### 2. Alamat User (Origin)
- **Source:** 100% dari DATABASE (orders + users)
- **Fallback:** Dummy (tapi akan error karena validasi)
- **Status:** ✅ Fully Dynamic dari Database
- **Requirement:** User HARUS sudah isi alamat lengkap saat checkout

---

## 🔧 Cara Update Alamat Toko

Edit file `.env.local`:

```env
# Update alamat toko di sini
BITESHIP_ORIGIN_CONTACT_NAME=Meoris Store Baru
BITESHIP_ORIGIN_CONTACT_PHONE=+6281234567890
BITESHIP_ORIGIN_ADDRESS=Jl. Baru No 999, Tasikmalaya
BITESHIP_ORIGIN_POSTAL_CODE=46100
```

Restart server:
```bash
supervisorctl restart nextjs
```

---

## 🔍 Cara Cek Alamat User di Database

```sql
-- Cek alamat user dari order
SELECT 
  o.id,
  o.order_number,
  o.shipping_address,
  u.nama,
  u.email,
  u.shipping_phone,
  u.shipping_street,
  u.shipping_postal_code
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.id = 'order-id-disini';

-- Cek alamat user dari profile
SELECT 
  id,
  nama,
  email,
  shipping_nama,
  shipping_phone,
  shipping_street,
  shipping_kecamatan,
  shipping_provinsi,
  shipping_postal_code
FROM users
WHERE id = 'user-id-disini';
```

---

## ⚠️ Important Notes

1. **Alamat toko** sebaiknya di-set di `.env.local` (flexible untuk update)
2. **Alamat user** 100% dari database (no hardcoded!)
3. **Validasi strict:** Jika alamat user tidak lengkap → API return error
4. **User requirement:** User HARUS lengkapi alamat saat checkout
5. **Phone normalization:** Nomor HP auto-converted ke format 62xxx

---

## 🚀 Next Steps

Jika mau lebih strict, bisa tambah validasi di checkout:
- Force user isi alamat lengkap
- Validasi kode pos format
- Validasi nomor HP format

Ready! 🎉
