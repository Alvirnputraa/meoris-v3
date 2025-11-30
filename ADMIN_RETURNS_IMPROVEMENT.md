# Admin Returns Page Improvement

## Perubahan yang Dilakukan

### 1. Modifikasi Kolom Aksi di Tabel
**Sebelum:**
- Status `pending`: Menampilkan tombol "Setujui" dan "Tolak" langsung di tabel
- Status lain: Menampilkan tombol "Detail"

**Sesudah:**
- Semua status: Menampilkan tombol "Detail" saja

**File:** `src/app/admin/returns/page.tsx` (line 519-528)

**Alasan:**
- Admin perlu melihat detail lengkap sebelum memutuskan approve/reject
- Konsistensi UX - semua row memiliki tombol yang sama
- Mengurangi risiko approve/reject yang tidak disengaja

---

### 2. Penambahan Konten di Sidebar Detail

#### A. List Produk yang Dipesan
**Lokasi:** Setelah section "Detail Pengajuan Pengembalian"

**Konten yang Ditampilkan:**
- Foto produk (jika ada)
- Nama produk
- Ukuran
- Quantity
- Harga per item

**File:** `src/app/admin/returns/page.tsx` (line 623-646)

**UI Design:**
```
List Produk yang Dipesan
┌──────────────────────────────────┐
│ [Foto] Nama Produk               │
│        Ukuran: 40 | Qty: 2       │
│        Harga: Rp 150,000         │
└──────────────────────────────────┘
```

#### B. Tombol Setujui dan Tolak di Sidebar
**Lokasi:** Di bagian bawah sidebar (sticky bottom)

**Kondisi Tampil:**
- Hanya muncul ketika status return = `pending`

**Tombol:**
1. **Tolak Pengembalian**
   - Warna: Red (bg-red-50 hover:bg-red-100)
   - Position: Kiri
   - Action: Prompt input alasan → Reject return → Tutup sidebar → Reload list

2. **Setujui Pengembalian**
   - Warna: Green (bg-green-600 hover:bg-green-700)
   - Position: Kanan
   - Action: Confirm → Approve return → Tutup sidebar → Reload list

**File:** `src/app/admin/returns/page.tsx` (line 664-684)

**UI Design:**
```
┌──────────────────────────────────┐
│                                  │
│  (Sticky bottom - border-top)   │
│                                  │
│  [Tolak]      [Setujui]         │
│                                  │
└──────────────────────────────────┘
```

---

### 3. Update Handler Functions

#### handleApprove
**Perubahan:**
- Tambahan: `setShowSidebar(false)` setelah sukses
- Tambahan: `setSelectedReturn(null)` untuk clear state

**File:** `src/app/admin/returns/page.tsx` (line 180-209)

#### handleReject
**Perubahan:**
- Tambahan: `setShowSidebar(false)` setelah sukses
- Tambahan: `setSelectedReturn(null)` untuk clear state

**File:** `src/app/admin/returns/page.tsx` (line 211-241)

---

## Flow Baru Admin Returns

### Scenario: Admin Menyetujui Return Request

1. Admin buka halaman `/admin/returns`
2. Admin lihat list return dengan status `pending`
3. Admin klik tombol **"Detail"** di kolom Aksi
4. Sidebar terbuka di sebelah kanan dengan konten:
   - Detail Pengajuan Pengembalian
     - Alasan Pengembalian
     - Deskripsi
     - Link Video Unboxing (jika ada)
     - Foto Produk (jika ada)
   - **List Produk yang Dipesan** ✨ (NEW)
     - Foto produk
     - Nama produk
     - Ukuran & Quantity
     - Harga
   - Alamat Pengiriman
   - **Tombol Setujui dan Tolak** ✨ (NEW - di bottom)
5. Admin review semua informasi
6. Admin klik **"Setujui Pengembalian"**
7. Muncul confirmation: "Apakah Anda yakin ingin menyetujui pengembalian ini?"
8. Admin klik OK
9. API dipanggil untuk approve return
10. Muncul alert: "Pengembalian berhasil disetujui"
11. Sidebar otomatis tertutup
12. List return di-reload (status berubah dari `pending` ke `approved`)

### Scenario: Admin Menolak Return Request

1. Admin buka halaman `/admin/returns`
2. Admin lihat list return dengan status `pending`
3. Admin klik tombol **"Detail"** di kolom Aksi
4. Sidebar terbuka
5. Admin review semua informasi
6. Admin klik **"Tolak Pengembalian"**
7. Muncul prompt: "Masukkan alasan penolakan:"
8. Admin input alasan (misal: "Produk rusak karena kesalahan pemakaian")
9. API dipanggil untuk reject return
10. Muncul alert: "Pengembalian berhasil ditolak"
11. Sidebar otomatis tertutup
12. List return di-reload (status berubah dari `pending` ke `rejected`)

---

## Testing Checklist

### Test 1: Tampilan Tabel
- [ ] Semua return (pending dan non-pending) menampilkan tombol "Detail"
- [ ] Tidak ada tombol "Setujui" atau "Tolak" di tabel
- [ ] Tombol "Detail" berwarna biru (bg-blue-50)

### Test 2: Sidebar untuk Pending Return
- [ ] Klik "Detail" pada return dengan status `pending`
- [ ] Sidebar terbuka di kanan
- [ ] Section "Detail Pengajuan Pengembalian" muncul dengan:
  - [ ] Alasan Pengembalian
  - [ ] Deskripsi
  - [ ] Link Video Unboxing (jika ada)
  - [ ] Foto Produk (jika ada)
- [ ] Section "List Produk yang Dipesan" muncul dengan:
  - [ ] Foto produk
  - [ ] Nama produk
  - [ ] Ukuran & Qty
  - [ ] Harga
- [ ] Section "Alamat Pengiriman" muncul
- [ ] Di bagian bawah ada 2 tombol:
  - [ ] "Tolak Pengembalian" (merah, kiri)
  - [ ] "Setujui Pengembalian" (hijau, kanan)

### Test 3: Approve Return
- [ ] Klik "Setujui Pengembalian"
- [ ] Muncul confirmation dialog
- [ ] Klik OK
- [ ] Muncul alert success
- [ ] Sidebar tertutup
- [ ] List return di-reload
- [ ] Status return berubah menjadi `approved`

### Test 4: Reject Return
- [ ] Klik "Tolak Pengembalian"
- [ ] Muncul prompt input alasan
- [ ] Input alasan penolakan
- [ ] Muncul alert success
- [ ] Sidebar tertutup
- [ ] List return di-reload
- [ ] Status return berubah menjadi `rejected`

### Test 5: Sidebar untuk Non-Pending Return
- [ ] Klik "Detail" pada return dengan status bukan `pending` (misal: `approved`, `rejected`)
- [ ] Sidebar terbuka
- [ ] Section detail muncul normal
- [ ] Section "List Produk yang Dipesan" muncul
- [ ] **TIDAK ADA** tombol "Setujui" atau "Tolak" di bottom

---

## API yang Digunakan

### GET /api/admin/returns/detail
**Input:**
- `returnId`: ID return yang ingin di-fetch
- `adminId`: ID admin yang login

**Output:**
```json
{
  "success": true,
  "return": {
    "id": "...",
    "orderId": "DEV-T44456...",
    "customer": "John Doe",
    "reason": "Produk cacat",
    "description": "...",
    "videoLink": "https://...",
    "photoPaths": ["url1", "url2"],
    "status": "pending",
    "orderItems": [  // ← Data ini yang digunakan untuk "List Produk yang Dipesan"
      {
        "id": "...",
        "quantity": 2,
        "size": "40",
        "price": 150000,
        "produk": {
          "id": "...",
          "nama_produk": "Sandal ABC",
          "photo1": "url..."
        }
      }
    ]
  },
  "customerAddress": { ... }
}
```

### POST /api/admin/returns/approve
**Input:**
```json
{
  "returnId": "...",
  "adminId": "..."
}
```

**Action:**
- Update `returns.status` = `approved`
- Update `returns.approved_at` = NOW()
- Create notification untuk customer

### POST /api/admin/returns/reject
**Input:**
```json
{
  "returnId": "...",
  "adminId": "...",
  "reason": "Alasan penolakan"
}
```

**Action:**
- Update `returns.status` = `rejected`
- Update `returns.rejection_reason` = reason
- Create notification untuk customer

---

## Screenshots Lokasi

### Before:
```
Tabel Returns
┌──────────────────────────────────────────────────┐
│ Order ID | Customer | Status  | Aksi           │
├──────────────────────────────────────────────────┤
│ DEV-123  | John     | pending | [Setuju][Tolak]│  ← Langsung approve/reject
│ DEV-456  | Jane     | approved| [Detail]       │
└──────────────────────────────────────────────────┘
```

### After:
```
Tabel Returns
┌──────────────────────────────────────────────────┐
│ Order ID | Customer | Status  | Aksi           │
├──────────────────────────────────────────────────┤
│ DEV-123  | John     | pending | [Detail]       │  ← Semua pakai Detail
│ DEV-456  | Jane     | approved| [Detail]       │
└──────────────────────────────────────────────────┘

Sidebar (ketika klik Detail pada pending return):
┌───────────────────────────────────────┐
│ Detail Pengembalian             [X]   │
├───────────────────────────────────────┤
│ Detail Pengajuan Pengembalian         │
│ - Alasan: Produk cacat                │
│ - Deskripsi: ...                      │
│ - Video: https://...                  │
│ - Foto: [img][img][img]              │
│                                       │
│ List Produk yang Dipesan ✨ NEW       │
│ ┌───────────────────────────┐        │
│ │ [Foto] Sandal ABC         │        │
│ │        Ukuran: 40 | Qty: 2│        │
│ │        Harga: Rp 150,000  │        │
│ └───────────────────────────┘        │
│                                       │
│ Alamat Pengiriman                     │
│ - Nama: John Doe                      │
│ - Phone: 08123456789                  │
│ - Alamat: Jl. ...                     │
│                                       │
│ ───────────────────────────────       │
│ [Tolak]            [Setujui] ✨ NEW  │
└───────────────────────────────────────┘
```

---

## Benefits

1. **UX Lebih Baik untuk Admin:**
   - Admin bisa review semua detail sebelum approve/reject
   - Mengurangi risiko salah klik
   - Informasi lebih lengkap (termasuk produk yang dipesan)

2. **Konsistensi:**
   - Semua row di tabel memiliki aksi yang sama ("Detail")
   - Flow yang lebih predictable

3. **Informasi Lebih Lengkap:**
   - Admin bisa lihat produk yang dipesan (nama, ukuran, qty, harga)
   - Membantu decision making untuk approve/reject

4. **Better Decision Making:**
   - Admin bisa cross-check antara produk yang dipesan vs alasan return
   - Misal: Customer bilang "salah ukuran", admin bisa cek ukuran yang dipesan

---

## Files Modified

1. `src/app/admin/returns/page.tsx`
   - Line 519-528: Modifikasi kolom Aksi (semua jadi "Detail")
   - Line 180-209: Update handleApprove (tambah close sidebar)
   - Line 211-241: Update handleReject (tambah close sidebar)
   - Line 623-646: Tambah section "List Produk yang Dipesan"
   - Line 664-684: Tambah tombol Setujui/Tolak di sidebar bottom

## Cara Test

1. Buat pengajuan return baru dari user side
2. Login sebagai admin
3. Buka `/admin/returns`
4. Klik tombol "Detail" pada return dengan status `pending`
5. Verifikasi semua konten sidebar muncul
6. Test approve atau reject
7. Verifikasi sidebar tertutup dan list ter-reload

---

**Status:** ✅ IMPLEMENTED
**Date:** 2025-11-13
**Author:** Claude Code
