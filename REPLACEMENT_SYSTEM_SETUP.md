# Sistem Penggantian Barang (Replacement System)

## Overview

Sistem ini memungkinkan admin untuk mengelola pengembalian barang dari customer, melakukan validasi, dan mengirimkan barang pengganti dengan generate resi otomatis melalui Biteship.

## Alur Lengkap

### User Side:
1. User mengajukan pengembalian (return request) - **Status: pending**
2. User menunggu approval dari admin
3. Setelah approved, user mengatur pengiriman return (pickup/dropoff)
4. Barang dikirim ke toko - **Status: approved, shipping_arranged: true**
5. Toko menerima barang - **Timeline: validation**
6. Admin melakukan validasi
7. Jika validasi approved, admin isi form produk pengganti
8. Admin generate resi dan kirim barang pengganti - **Status: replacement_shipped**
9. User terima barang pengganti - **Status: completed**

### Admin Side:
1. **Tab Pending** - Approve atau Reject permintaan return
2. **Tab Approved** - Klik Detail untuk:
   - Lihat detail pengajuan (alasan, deskripsi, foto, video)
   - Lihat alamat pengiriman customer
   - Isi form produk pengganti (nama, ukuran, jumlah)
   - Pilih kurir (SiCepat/JNT/JNE)
   - Approve dan Generate Resi

## Database Schema

### Tabel Baru: `replacement_items`
```sql
CREATE TABLE replacement_items (
  id UUID PRIMARY KEY,
  return_id UUID REFERENCES returns(id),
  product_name TEXT NOT NULL,
  product_size TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Kolom Baru di `returns`:
- `replacement_courier` - Courier untuk kirim pengganti (sicepat/jnt/jne)
- `replacement_courier_service` - Nama service courier
- `replacement_waybill` - Nomor resi pengganti
- `replacement_shipped_at` - Timestamp pengiriman pengganti
- `validation_completed_at` - Timestamp validasi selesai
- `validation_notes` - Catatan admin saat validasi

### Tabel: `return_replacement_history`
```sql
CREATE TABLE return_replacement_history (
  id UUID PRIMARY KEY,
  return_id UUID REFERENCES returns(id),
  waybill TEXT NOT NULL,
  courier TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  updated_at TIMESTAMPTZ
);
```

## API Endpoints

### 1. GET `/api/admin/returns/list`
List semua return requests dengan filter
- Query: `adminId`, `status`
- Response: Array of returns

### 2. GET `/api/admin/returns/detail`
Get detail return dengan semua data terkait
- Query: `returnId`, `adminId`
- Response: Return detail + customer address + replacement items + history

### 3. POST `/api/admin/returns/approve`
Approve return request (dari pending → approved)
- Body: `{ returnId, adminId }`

### 4. POST `/api/admin/returns/reject`
Reject return request
- Body: `{ returnId, adminId, reason }`

### 5. POST `/api/admin/returns/validate`
Complete validation (approved/rejected)
- Body: `{ returnId, adminId, validationResult, validationNotes }`

### 6. POST `/api/admin/returns/replacement/add-items`
Add replacement items
- Body: `{ returnId, adminId, items: [...] }`

### 7. POST `/api/admin/returns/replacement/ship`
Generate resi dan kirim pengganti
- Body: `{ returnId, adminId, courier }`
- Integrates with Biteship API
- Updates status to `replacement_shipped`

## Setup Instructions

### 1. Jalankan SQL Migration
```bash
# Di Supabase SQL Editor, jalankan:
create_replacement_system.sql
```

### 2. Update Admin Returns Page
```bash
# Backup file lama
mv src/app/admin/returns/page.tsx src/app/admin/returns/page_old.tsx

# Gunakan file baru
mv src/app/admin/returns/page_new.tsx src/app/admin/returns/page.tsx
```

### 3. Environment Variables
Pastikan `.env` atau `.env.local` sudah ada:
```
BITESHIP_API_KEY=your_biteship_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Admin Authentication
Admin ID disimpan di localStorage dengan key `adminId`. Pastikan admin login terlebih dahulu.

## Status Flow

```
pending (user ajukan)
  ↓ [admin approve]
approved (admin setuju)
  ↓ [user atur pengiriman]
approved + shipping_arranged: true (barang dikirim ke toko)
  ↓ [admin validasi]
approved + validasi: approved (validasi lulus)
  ↓ [admin generate resi]
replacement_shipped (pengganti dikirim)
  ↓ [user terima barang]
completed (selesai)
```

## UI Features

### Admin Returns Page
1. **Stats Cards**: Total, Pending, Disetujui, Selesai
2. **Search & Filter**: Cari by ID/customer, filter by status
3. **Table Columns**: Order ID, Customer, Alasan, Jumlah, Status, Tanggal, Aksi
4. **Aksi Buttons**:
   - Pending: Setuju / Tolak
   - Approved: Detail

### Sidebar Detail (Klik Detail)
1. **Return Info**: Order ID, Customer, Status
2. **Detail Pengajuan**: Alasan, Deskripsi, Video Link, Foto
3. **Alamat Pengiriman**: Nama, Phone, Alamat lengkap
4. **Form Isian Produk Penggantian**:
   - Input: Nama Produk
   - Input: Ukuran Produk
   - Input: Jumlah Produk
   - Button: Add
5. **List Produk**: List item yang sudah ditambahkan
   - Button: Simpan Produk
6. **Pilih Kurir**: Radio buttons (SiCepat / JNT / JNE)
7. **Button**: Approve dan Generate Resi

## Testing

### Test Case 1: Approve Return
```bash
# Navigate to http://localhost:3000/admin/returns
# Find pending return
# Click "Setuju"
# Verify status changed to "approved"
```

### Test Case 2: Add Replacement Items & Ship
```bash
# Click "Detail" on approved return
# Fill form: Nama Produk, Ukuran, Jumlah
# Click "Add"
# Click "Simpan Produk"
# Select courier (e.g., SiCepat)
# Click "Approve dan Generate Resi"
# Verify resi generated and status = replacement_shipped
```

### Test Case 3: Reject Return
```bash
# Find pending return
# Click "Tolak"
# Enter reason
# Verify status changed to "rejected"
```

## Troubleshooting

### Error: "User address not found"
- Pastikan user memiliki alamat di tabel `user_addresses`
- Check dengan query:
```sql
SELECT * FROM user_addresses WHERE user_id = 'user_id_here';
```

### Error: "Failed to generate waybill"
- Check Biteship API key valid
- Check format alamat lengkap
- Check nomor telepon valid (min 10 digit)
- Lihat console log untuk response Biteship

### Sidebar tidak muncul
- Check browser console untuk error
- Pastikan adminId ada di localStorage
- Verify API endpoint `/api/admin/returns/detail` working

## Next Steps

1. ✅ Setup database tables
2. ✅ Create API endpoints
3. ✅ Update admin UI
4. ✅ Test complete flow
5. 🔜 Add webhook integration for tracking
6. 🔜 Add notification when replacement shipped
7. 🔜 Update user timeline to show replacement tracking

## File Structure

```
src/app/
├── api/
│   └── admin/
│       └── returns/
│           ├── approve/route.ts
│           ├── reject/route.ts
│           ├── validate/route.ts
│           ├── list/route.ts
│           ├── detail/route.ts
│           └── replacement/
│               ├── add-items/route.ts
│               └── ship/route.ts
└── admin/
    └── returns/
        └── page.tsx (updated)

SQL Files:
- create_replacement_system.sql
```

## Notes

- Status `replacement_shipped` adalah status baru yang menandakan pengganti sudah dikirim
- Admin harus melakukan validasi approved dulu sebelum bisa isi form pengganti
- Replacement items bisa multiple (untuk kasus order berisi beberapa produk)
- Biteship integration sama seperti return shipping, tapi origin dari toko ke customer
