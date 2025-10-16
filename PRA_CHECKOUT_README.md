# 📋 Sistem Pra-Checkout - MEORIS SANDAL

Dokumentasi lengkap untuk fitur pra-checkout yang memungkinkan penyimpanan data pesanan sementara sebelum proses checkout final.

## 🎯 Tujuan

Sistem pra-checkout dibuat untuk:
- Menyimpan detail pesanan user sementara sebelum checkout final
- Mempertahankan data voucher dan diskon yang sudah diapply
- Memungkinkan recovery jika user meninggalkan halaman checkout
- Audit trail untuk tracking pesanan yang belum selesai

## 📊 Struktur Database

### Tabel: `pra_checkout`
Menyimpan header informasi pesanan sementara:

```sql
pra_checkout (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    subtotal DECIMAL(10,2) NOT NULL,
    voucher_code VARCHAR(50), -- Kode voucher yang digunakan
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, completed, expired
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### Tabel: `pra_checkout_items`
Menyimpan detail produk dalam pesanan:

```sql
pra_checkout_items (
    id UUID PRIMARY KEY,
    pra_checkout_id UUID REFERENCES pra_checkout(id),
    produk_id UUID REFERENCES produk(id),
    quantity INTEGER NOT NULL,
    size VARCHAR(50), -- Ukuran yang dipilih
    harga_satuan DECIMAL(10,2) NOT NULL, -- Harga saat checkout
    subtotal_item DECIMAL(10,2) NOT NULL, -- quantity * harga_satuan
    created_at TIMESTAMP
)
```

## 🔄 Flow Proses Checkout

### 1. User di Halaman Detail-Checkout
**URL:** `http://localhost:3000/produk/detail-checkout`

**Yang terjadi:**
- User melihat daftar produk dalam keranjang
- User bisa apply voucher untuk mendapat diskon
- User melihat subtotal, diskon, dan total akhir

### 2. Klik Button "Checkout"
**Location:** [`src/app/produk/detail-checkout/page.tsx:119`](src/app/produk/detail-checkout/page.tsx:119)

**Yang terjadi saat klik:**

```javascript
const handleCheckout = async () => {
  // 1. Validasi user login
  if (!user) {
    alert('Silakan login terlebih dahulu')
    return
  }

  // 2. Validasi keranjang tidak kosong
  if (viewItems.length === 0) {
    alert('Keranjang kosong')
    return
  }

  try {
    // 3. Kirim data ke tabel pra_checkout
    const result = await praCheckoutDb.create(
      user.id,                    // User ID
      viewItems,                  // Array produk dalam keranjang
      appliedVoucher?.voucher,    // Kode voucher (jika ada)
      discount                    // Jumlah diskon
    )

    // 4. Redirect ke halaman checkout dengan ID
    window.location.href = `/produk/checkout?pra_checkout_id=${result.praCheckout.id}`
    
  } catch (error) {
    alert('Gagal memproses checkout. Silakan coba lagi.')
  }
}
```

### 3. Data yang Disimpan

**Header Pesanan (pra_checkout):**
- `user_id`: ID user yang checkout
- `subtotal`: Total harga sebelum diskon
- `voucher_code`: Kode voucher yang digunakan (jika ada)
- `discount_amount`: Jumlah potongan harga
- `total_amount`: Total akhir setelah diskon
- `status`: 'draft' (pesanan sementara)

**Detail Produk (pra_checkout_items):**
- `produk_id`: ID produk yang dipesan
- `quantity`: Jumlah produk
- `size`: Ukuran yang dipilih
- `harga_satuan`: Harga produk saat checkout
- `subtotal_item`: Total per item (quantity × harga_satuan)

### 4. Redirect ke Checkout Page
**URL:** `http://localhost:3000/produk/checkout?pra_checkout_id=xxx`

User dibawa ke halaman checkout final dengan:
- Data pesanan sudah tersimpan
- Form alamat pengiriman
- Konfirmasi pesanan
- Button "Lanjutkan Pembayaran"

## 🛠 Fungsi Database

### [`praCheckoutDb.create()`](src/lib/database.ts:399)
```javascript
await praCheckoutDb.create(userId, cartItems, voucherCode?, discountAmount?)
```
**Return:** `{ praCheckout, items }`

### [`praCheckoutDb.getById()`](src/lib/database.ts:428)
```javascript
await praCheckoutDb.getById(praCheckoutId)
```
**Return:** Data pra-checkout dengan semua items

### [`praCheckoutDb.getByUserId()`](src/lib/database.ts:447)
```javascript
await praCheckoutDb.getByUserId(userId, status?)
```
**Return:** Array pra-checkout user berdasarkan status

### [`praCheckoutDb.updateStatus()`](src/lib/database.ts:469)
```javascript
await praCheckoutDb.updateStatus(praCheckoutId, 'completed')
```

### [`praCheckoutDb.delete()`](src/lib/database.ts:479)
```javascript
await praCheckoutDb.delete(praCheckoutId)
```

## 🔐 Security & RLS

**Files:**
- [`create_pra_checkout_tables.sql`](create_pra_checkout_tables.sql:1) - Schema tabel dengan RLS
- [`fix_pra_checkout_rls.sql`](fix_pra_checkout_rls.sql:1) - Fix untuk RLS policy issues

**RLS Policies:**
- User hanya bisa akses pra-checkout milik mereka sendiri
- User hanya bisa akses pra_checkout_items melalui pra-checkout mereka

## 🚀 Setup Instructions

### 1. Jalankan SQL Scripts
```sql
-- 1. Buat tabel baru
\i create_pra_checkout_tables.sql

-- 2. Fix RLS policy jika ada error 401
\i fix_pra_checkout_rls.sql
```

### 2. Import Fungsi Database
```javascript
import { praCheckoutDb } from '@/lib/database'
```

### 3. Implementasi di Component
```javascript
const handleCheckout = async () => {
  const result = await praCheckoutDb.create(user.id, cartItems, voucherCode, discount)
  window.location.href = `/produk/checkout?pra_checkout_id=${result.praCheckout.id}`
}
```

## 📝 Status Pesanan

- **`draft`** - Pesanan sementara yang baru dibuat
- **`completed`** - Pesanan sudah diselesaikan (optional)
- **`expired`** - Pesanan sudah expired (optional)

## 🔍 Troubleshooting

### Error 401 (Unauthorized)
**Solusi:** Jalankan [`fix_pra_checkout_rls.sql`](fix_pra_checkout_rls.sql:1)

### Error "Table doesn't exist"
**Solusi:** Jalankan [`create_pra_checkout_tables.sql`](create_pra_checkout_tables.sql:1)

### Error "Invalid DOM property stroke-width"
**Solusi:** Sudah diperbaiki dengan mengubah ke `strokeWidth`

## 📱 User Experience

1. **Detail-Checkout Page** - User review keranjang & apply voucher
2. **Klik Checkout** - Data tersimpan otomatis ke database
3. **Redirect** - Bawa ke halaman checkout final
4. **Alamat Pengiriman** - User isi form alamat
5. **Konfirmasi** - Review "Detail Order" 
6. **Pembayaran** - Klik "Lanjutkan Pembayaran"

## 🔧 Maintenance

- Pra-checkout records dengan status 'draft' bisa dibersihkan secara berkala
- Monitoring untuk pesanan yang tertunda terlalu lama
- Backup data penting sebelum cleanup

---

**Created:** 2025-09-22  
**Last Updated:** 2025-09-22  
**Version:** 1.0