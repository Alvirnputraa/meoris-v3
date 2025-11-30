# Quick Start Guide - Return Request Feature

## 🚀 Setup (Langkah-langkah Setup)

### 1. Database Setup

Jalankan SQL queries berikut di Supabase SQL Editor (berurutan):

```bash
# 1. Buat tabel returns (jika belum ada)
create_returns_table.sql

# 2. Tambah kolom untuk return shipping
add_return_shipping_columns.sql

# 3. Tambah kolom waybill
alter_returns_add_waybill.sql

# 4. Setup storage bucket untuk foto
setup_returns_storage_bucket.sql
```

### 2. Environment Variables

Pastikan file `.env` sudah memiliki:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Verifikasi Storage Bucket

1. Login ke Supabase Dashboard
2. Go to Storage
3. Pastikan bucket `returns` sudah ada
4. Jika belum, buat manual:
   - Bucket name: `returns`
   - Public: ✅ (checked)
   - Click "Create bucket"

---

## 📝 Cara Penggunaan (User Flow)

### Step 1: Login sebagai User
```
http://localhost:3000/login
```

### Step 2: Buka Halaman Pesanan
```
http://localhost:3000/user/purchase?view=purchase
```

### Step 3: Pilih Order yang sudah Delivered
- Klik order yang sudah status "Terkirim" atau "Delivered"
- Pastikan order sudah dibayar (PAID)

### Step 4: Klik "Ajukan Pengembalian"
- Button akan muncul di kanan atas jika order eligible
- Button TIDAK akan muncul jika:
  - Order belum dibayar
  - Order belum delivered
  - Sudah pernah ajukan return sebelumnya

### Step 5: Isi Form Pengembalian

**Form Fields:**
1. **No. Pesanan** - Auto-filled (read-only)
2. **Alasan Pengembalian** - Dropdown (required)
   - Produk cacat/rusak
   - Ukuran tidak sesuai
   - Warna tidak sesuai
   - Barang tidak sesuai deskripsi
   - Lainnya
3. **Deskripsi** - Textarea (required)
4. **Foto Produk** - Upload max 5 foto (optional)
5. **Link Video Unboxing** - URL (optional)

### Step 6: Submit
- Klik "Kirim Pengajuan"
- Wait for success message
- Form akan close otomatis
- Status akan berubah jadi "Menunggu Persetujuan"

---

## 🔍 Testing Checklist

### ✅ Happy Path Testing

- [ ] User dapat membuka form pengembalian
- [ ] User dapat memilih alasan dari dropdown
- [ ] User dapat menulis deskripsi
- [ ] User dapat upload foto (1-5 files)
- [ ] User dapat memasukkan link video
- [ ] Submit berhasil dan dapat success message
- [ ] Form tertutup setelah submit
- [ ] Status berubah dari button ke "Menunggu Persetujuan"
- [ ] Button "Ajukan Pengembalian" hilang setelah submit
- [ ] Data tersimpan di database table `returns`
- [ ] Foto terupload ke Storage bucket `returns`

### ❌ Validation Testing

- [ ] Submit tanpa alasan → Error: "Pilih alasan pengembalian"
- [ ] Submit tanpa deskripsi → Error: "Masukkan deskripsi"
- [ ] Submit untuk order UNPAID → Error: "Hanya pesanan yang sudah dibayar..."
- [ ] Submit untuk order belum delivered → Error: "Hanya pesanan yang sudah diterima..."
- [ ] Submit duplicate return → Error: "Pengembalian untuk pesanan ini sudah pernah diajukan"
- [ ] Upload > 5 foto → Hanya 5 yang diupload

### 🔐 Security Testing

- [ ] User A tidak bisa submit return untuk order milik User B
- [ ] Unauthenticated user tidak bisa access API
- [ ] File upload terbatas ke image types only
- [ ] SQL injection prevention
- [ ] XSS prevention di form inputs

---

## 🗄️ Database Check

### Check Return Record

```sql
SELECT * FROM returns
WHERE order_id = 'YOUR_ORDER_ID'
ORDER BY created_at DESC;
```

### Check dengan Join ke Orders

```sql
SELECT
  r.id,
  r.order_number,
  r.reason,
  r.description,
  r.status,
  r.created_at,
  o.payment_status,
  o.shipping_status,
  array_length(r.photo_paths, 1) as photo_count,
  array_length(r.video_paths, 1) as video_count
FROM returns r
LEFT JOIN orders o ON r.order_id = o.id
WHERE r.user_id = 'YOUR_USER_ID'
ORDER BY r.created_at DESC;
```

### Check Storage Files

```sql
SELECT
  name,
  bucket_id,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'returns'
ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### Issue: Button "Ajukan Pengembalian" tidak muncul

**Cek:**
1. Order payment_status = 'PAID'?
2. Order status = 'delivered' atau 'completed'?
3. Order shipping_status includes 'terkirim'?
4. Sudah pernah submit return sebelumnya?

**Solution:**
```javascript
// Di console browser:
console.log('Payment Status:', selectedOrder.payment_status);
console.log('Order Status:', selectedOrder.status);
console.log('Shipping Status:', selectedOrder.shipping_status);
console.log('Existing Return:', existingReturn);
```

### Issue: Upload foto gagal

**Cek:**
1. Bucket 'returns' sudah dibuat?
2. Bucket bersifat public?
3. RLS policies sudah di-setup?
4. File size < 5MB?
5. File type adalah image?

**Solution:**
```bash
# Run di Supabase SQL Editor:
SELECT * FROM storage.buckets WHERE id = 'returns';

# Check policies:
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

### Issue: API Error 500

**Cek:**
1. SUPABASE_SERVICE_ROLE_KEY di .env?
2. Table 'returns' sudah ada?
3. Columns sudah sesuai schema?

**Solution:**
```bash
# Check .env
cat .env | grep SUPABASE_SERVICE_ROLE_KEY

# Check table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'returns'
);
```

### Issue: Duplicate return error tapi belum pernah submit

**Penyebab:** Ada return record dengan status selain 'rejected'

**Solution:**
```sql
-- Cek existing returns
SELECT * FROM returns WHERE order_id = 'YOUR_ORDER_ID';

-- Jika ada dan ingin reset (HATI-HATI!):
DELETE FROM returns WHERE order_id = 'YOUR_ORDER_ID';
```

---

## 📊 Expected Results

### 1. Database Record

```sql
{
  "id": "uuid-here",
  "created_at": "2025-01-XX...",
  "user_id": "user-uuid",
  "order_id": "order-uuid",
  "order_number": "ORD-123",
  "reason": "Produk cacat/rusak",
  "description": "Sepatu sol terkelupas...",
  "photo_paths": [
    "https://...supabase.co/storage/v1/object/public/returns/return_uuid_timestamp_photo1.jpg",
    "https://...supabase.co/storage/v1/object/public/returns/return_uuid_timestamp_photo2.jpg"
  ],
  "video_paths": [
    "https://www.youtube.com/watch?v=example"
  ],
  "status": "pending"
}
```

### 2. Frontend Status Display

Setelah submit, button berubah jadi:
```
[✓] Pengembalian: Menunggu Persetujuan
```

### 3. API Response

```json
{
  "success": true,
  "message": "Pengajuan pengembalian berhasil dikirim",
  "data": {
    "id": "uuid",
    "status": "pending",
    ...
  }
}
```

---

## 🎯 Next Steps (Optional Enhancements)

1. **Admin Panel** - Approve/reject returns
2. **Email Notifications** - Notify user on status changes
3. **Return Shipping** - Generate return label
4. **Refund Processing** - Auto refund after return received
5. **Return Analytics** - Dashboard untuk return metrics

---

## 📞 Support

Jika ada issue, cek:
1. Console browser (F12) untuk error messages
2. Supabase logs untuk database errors
3. Network tab untuk API call failures
4. `RETURN_REQUEST_IMPLEMENTATION.md` untuk detail teknis

---

**✅ Implementation Complete!**

Fitur Permintaan Pengembalian sudah fully functional dengan:
- ✅ Full validation (frontend & backend)
- ✅ Photo upload support
- ✅ Video link support
- ✅ Duplicate prevention
- ✅ Status tracking
- ✅ User feedback
- ✅ Security measures
