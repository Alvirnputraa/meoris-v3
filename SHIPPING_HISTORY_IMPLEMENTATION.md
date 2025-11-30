# 📦 Implementasi Shipping History - Real Tracking dari Biteship

## ✅ Status: Implementasi Selesai

Tracking pengiriman sekarang menggunakan **data real dari database** yang diupdate oleh Biteship webhook.

---

## 🎯 Yang Sudah Dikerjakan

### 1. ✅ Database Schema
**File:** `create_shipping_history_table.sql`

Tabel `shipping_history` dibuat dengan kolom:
- `id` - Primary key (UUID)
- `order_id` - Foreign key ke orders
- `event_type` - Tipe event (order.status / order.waybill_id)
- `biteship_status` - Status asli dari Biteship
- `status_display` - Status bahasa Indonesia (user-friendly)
- `courier_name` - Nama ekspedisi (JNE, SiCepat, dll)
- `courier_tracking_id` - Biteship tracking ID
- `courier_waybill_id` - Nomor resi
- `note` - Catatan tambahan
- `location` - Lokasi paket (optional)
- `webhook_payload` - Full payload JSON untuk debugging
- `created_at` - Timestamp

**Row Level Security (RLS):**
- User hanya bisa lihat history order mereka sendiri
- Service role (webhook) bisa insert data

**Indexes:**
- `idx_shipping_history_order_id` - Query by order
- `idx_shipping_history_created_at` - Sorting timeline
- `idx_shipping_history_order_created` - Composite index

### 2. ✅ Backend - Webhook Integration
**File:** `src/app/api/biteship/webhook/route.ts`

**Perubahan:**
- Setiap kali webhook menerima event `order.status`, insert ke `shipping_history`
- Setiap kali webhook menerima event `order.waybill_id`, insert ke `shipping_history`
- Simpan full webhook payload untuk debugging
- Update `orders` table tetap berjalan (backward compatible)

**Flow:**
1. Biteship kirim webhook update
2. Update tabel `orders` (shipping_status & shipping_resi)
3. Insert row baru ke `shipping_history`
4. Return success ke Biteship

### 3. ✅ Frontend - Display Timeline
**File:** `src/app/user/purchase/page.tsx`

**Perubahan:**
- Load `shipping_history` saat user buka order detail
- Tampilkan timeline dari database (bukan dummy)
- Timeline sorted dari lama ke baru (ascending)
- Visual indicator:
  - 🟢 Hijau = Delivered
  - 🔵 Biru = Status terbaru
  - ⚪ Abu = Status lama
- Tampilkan timestamp, status, ekspedisi, dan note

### 4. ✅ Helper Functions
**File:** `src/lib/database.ts`

**Fungsi baru:**
```typescript
shippingHistoryDb.getByOrderId(orderId)  // Get full history
shippingHistoryDb.getLatest(orderId)     // Get latest status only
```

---

## 🧪 Cara Testing

### Test 1: Simulasi Webhook dengan Postman

Gunakan Postman collection yang sudah ada: `Biteship_Webhook_Tests.postman_collection.json`

**Contoh Flow Lengkap:**

1. **Buat order test** atau gunakan order ID yang ada
2. **Status: Confirmed**
   ```json
   POST /api/biteship/webhook
   {
     "event": "order.status",
     "order_id": "YOUR_ORDER_ID",
     "status": "confirmed",
     "courier_name": "JNE"
   }
   ```

3. **Waybill ID Update**
   ```json
   {
     "event": "order.waybill_id",
     "order_id": "YOUR_ORDER_ID",
     "courier_waybill_id": "JNE123456789",
     "courier_name": "JNE"
   }
   ```

4. **Status: Picked**
   ```json
   {
     "event": "order.status",
     "order_id": "YOUR_ORDER_ID",
     "status": "picked",
     "courier_name": "JNE"
   }
   ```

5. **Status: Dropping Off**
   ```json
   {
     "event": "order.status",
     "order_id": "YOUR_ORDER_ID",
     "status": "dropping_off",
     "courier_name": "JNE"
   }
   ```

6. **Status: Delivered**
   ```json
   {
     "event": "order.status",
     "order_id": "YOUR_ORDER_ID",
     "status": "delivered",
     "courier_name": "JNE"
   }
   ```

### Test 2: Cek Database

```sql
-- Lihat semua shipping history untuk order
SELECT
  created_at,
  event_type,
  status_display,
  courier_name,
  courier_waybill_id
FROM shipping_history
WHERE order_id = 'YOUR_ORDER_ID'
ORDER BY created_at ASC;
```

### Test 3: Cek Frontend

1. Login ke user account
2. Buka "Pesanan Saya"
3. Klik order yang sudah ada tracking
4. Lihat section "Tracking Pengiriman"
5. Timeline harus menampilkan semua update dari database

**URL Example:**
```
http://localhost:3000/user/purchase?view=order-detail&order=YOUR_ORDER_ID
```

---

## 📊 Status Mapping

| Biteship Status | Status Display (Indonesia) |
|----------------|---------------------------|
| `confirmed` | Menunggu pesanan diserahkan ke pihak jasa kirim |
| `allocated` | Menunggu penjemputan kurir |
| `picking_up` | Kurir menuju lokasi penjemputan |
| `picked` | Pesanan telah diserahkan ke jasa kirim |
| `dropping_off` | Dalam Pengiriman |
| `delivered` | Terkirim |
| `cancelled` | Dibatalkan |
| `rejected` | Ditolak |
| `returned` | Dikembalikan |
| `on_hold` | Ditahan |

---

## 🔧 Troubleshooting

### Issue: Timeline tidak muncul
**Solusi:**
1. Cek apakah order punya `shipping_resi`
2. Cek database: `SELECT * FROM shipping_history WHERE order_id = 'xxx'`
3. Cek console log di browser developer tools
4. Cek RLS policy: User harus bisa read shipping_history

### Issue: Webhook tidak insert ke shipping_history
**Solusi:**
1. Cek logs webhook: `console.log` di route.ts
2. Pastikan `supabaseAdmin` digunakan (bukan `supabase`)
3. Cek Service Role Key di environment variables
4. Test manual insert ke shipping_history

### Issue: Error "permission denied"
**Solusi:**
1. Pastikan RLS policy sudah dibuat
2. Pastikan user authenticated
3. Pastikan service role key valid untuk webhook

---

## 🚀 Deployment Checklist

- [x] Run migration SQL di production database
- [x] Update environment variables (BITESHIP_WEBHOOK_SECRET)
- [x] Deploy kode ke production
- [x] Test webhook dengan Postman ke production URL
- [x] Verify timeline tampil di frontend production
- [x] Monitor logs untuk error

---

## 📝 Notes

1. **Backward Compatible:** Tabel `orders` masih diupdate seperti sebelumnya
2. **History Non-Critical:** Jika insert history gagal, webhook tetap return success
3. **Full Payload Saved:** Semua data webhook disimpan di `webhook_payload` untuk debugging
4. **RLS Enabled:** User hanya bisa lihat tracking order mereka sendiri
5. **Scalable:** Index sudah ditambahkan untuk performance

---

## 🎉 Hasil Akhir

✅ **TIDAK ADA LAGI DATA DUMMY!**
- Timeline tracking **100% real dari database**
- Update otomatis dari Biteship webhook
- Visual timeline yang jelas dan informatif
- History lengkap tersimpan di database

**Before:** Timeline dummy (2 status hardcoded)
**After:** Timeline dynamic dari database (unlimited status updates)

---

## 📞 Support

Jika ada issue atau pertanyaan:
1. Cek logs di console browser
2. Cek logs webhook di server
3. Cek data di database `shipping_history`
4. Review dokumentasi Biteship: https://biteship.com/docs
