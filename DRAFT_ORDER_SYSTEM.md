# 📦 Draft Order System - Implementation Guide

## Overview

Sistem baru ini mengubah flow dari **auto-generate resi** menjadi **draft order** yang memerlukan konfirmasi manual dari admin sebelum resi dibuat di Biteship.

---

## 🔄 Flow Diagram

### Flow Lama (Auto-Generate):
```
Customer Bayar → PAID → ✅ Auto Generate Resi via Biteship → SHIPPED
```

### Flow Baru (Draft Order):
```
Customer Bayar → PAID (Draft Order) → Admin Review & Konfirmasi → Generate Resi → PROCESSING → Pack Barang → SHIPPED
```

---

## 📊 Status Order

| Status | Deskripsi | Shipping Resi | Shipping Status |
|--------|-----------|---------------|-----------------|
| `paid` | Pembayaran berhasil, menunggu konfirmasi admin | "Menunggu konfirmasi admin" | "Pembayaran berhasil, pesanan sedang diproses" |
| `processing` | Resi sudah dibuat, sedang packing | Nomor resi aktual | "Pesanan sedang dikemas" |
| `shipped` | Sudah diserahkan ke kurir | Nomor resi aktual | Status dari tracking API |
| `delivered` | Sampai ke customer | Nomor resi aktual | "Delivered" |
| `cancelled` | Order dibatalkan | - | "Dibatalkan" |

---

## 🛠️ Perubahan Teknis

### 1. **Tripay Callback (`src/server/tripay.ts`)**

**Sebelum:**
- Auto-generate resi via Biteship saat status PAID
- Update shipping_resi dengan nomor resi baru

**Sesudah:**
- TIDAK auto-generate resi
- Set `shipping_resi = "Menunggu konfirmasi admin"`
- Set `shipping_status = "Pembayaran berhasil, pesanan sedang diproses"`
- Kirim invoice tanpa nomor resi

### 2. **API Endpoints Baru**

#### A. **Single Generate Resi**
```
POST /api/admin/generate-resi
Body: { "orderId": "uuid" }
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "waybill": "JNE12345678",
    "trackingUrl": "https://...",
    "courier": {
      "code": "jne",
      "service": "reg"
    }
  }
}
```

**Response Error:**
```json
{
  "error": "Order harus berstatus PAID untuk generate resi",
  "currentStatus": "processing"
}
```

#### B. **Batch Generate Resi**
```
POST /api/admin/batch-generate-resi
Body: { "orderIds": ["uuid1", "uuid2", "uuid3"] }
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 3,
    "succeeded": 2,
    "failed": 1
  },
  "results": [
    {
      "orderId": "uuid1",
      "success": true,
      "waybill": "JNE111",
      "courier": "JNE REG"
    },
    ...
  ],
  "errors": [
    {
      "orderId": "uuid3",
      "error": "Resi sudah ada"
    }
  ]
}
```

### 3. **Admin Dashboard**

**URL:** `/admin/orders`

**Features:**
- ✅ View all orders with filters (All, Paid, Processing, Shipped)
- ✅ Single order resi generation
- ✅ Batch resi generation (select multiple orders)
- ✅ Real-time status update
- ✅ Order details (customer info, amount, date, shipping address)

**Filters:**
- **All**: Semua order
- **Paid**: Order yang sudah bayar, menunggu konfirmasi (draft orders)
- **Processing**: Order dengan resi sudah dibuat, sedang packing
- **Shipped**: Order yang sudah diserahkan ke kurir

---

## 👨‍💼 Admin Workflow

### Daily Operations:

1. **Morning: Review Paid Orders**
   - Buka `/admin/orders`
   - Filter: "Paid"
   - Cek order yang masuk semalam

2. **Check Stock & Address**
   - Review setiap order
   - Pastikan stok tersedia
   - Validasi alamat customer

3. **Generate Resi**

   **Option A - Single:**
   - Klik "Generate Resi" per order
   - System akan panggil Biteship API
   - Status berubah: PAID → PROCESSING

   **Option B - Batch:**
   - Centang beberapa order
   - Klik "Batch Generate Resi"
   - System generate semua sekaligus (dengan delay 500ms antar order)

4. **Pack Orders**
   - Filter: "Processing"
   - Print label resi
   - Pack barang
   - Siapkan untuk pickup kurir

5. **Kurir Pickup**
   - Webhook Biteship akan update status ke SHIPPED
   - Customer dapat tracking

---

## 📱 Customer Experience

### Saat Order Status PAID:
**Tampilan di halaman pesanan:**
```
Status: PAID
Resi: "Menunggu konfirmasi admin"
Shipping Status: "Pembayaran berhasil, pesanan sedang diproses"

💡 Info: Pesanan Anda sedang disiapkan oleh admin.
         Nomor resi akan diberikan dalam 1x24 jam.
```

### Saat Order Status PROCESSING:
```
Status: PROCESSING
Resi: "JNE1234567890"
Shipping Status: "Pesanan sedang dikemas"

📦 Lacak Pengiriman: [Button]
```

### Email Invoice:
**Subject:** Invoice #XXXXX - Meoris

**Content:**
- ✅ Detail pesanan
- ✅ Total pembayaran
- ⚠️ **Tanpa nomor resi** (jika masih PAID)
- ℹ️ Info: "Nomor resi akan dikirim setelah pesanan dikonfirmasi admin"

---

## 🔐 Security & Validation

### Generate Resi Validation:
1. ✅ Order harus status `PAID`
2. ✅ Shipping address harus lengkap
3. ✅ Resi belum pernah dibuat sebelumnya
4. ✅ Admin authentication (coming soon: protect `/admin/*` routes)

### Rate Limiting:
- Batch generation: 500ms delay antar order
- Prevent Biteship API rate limit

---

## 🧪 Testing Checklist

### Test Flow Lengkap:

- [ ] Customer checkout dan bayar via Tripay
- [ ] Order masuk dengan status PAID
- [ ] Resi = "Menunggu konfirmasi admin"
- [ ] Admin login ke `/admin/orders`
- [ ] Filter "Paid" menampilkan order baru
- [ ] Klik "Generate Resi" untuk 1 order
- [ ] Resi berhasil dibuat via Biteship
- [ ] Status berubah PAID → PROCESSING
- [ ] Shipping resi berisi nomor resi aktual
- [ ] Customer dapat melihat nomor resi di halaman pesanan
- [ ] Webhook tracking update status ke SHIPPED
- [ ] Customer dapat tracking via button "Lacak Pengiriman"

### Test Batch Generation:

- [ ] Buat beberapa test orders dengan status PAID
- [ ] Admin select multiple orders
- [ ] Klik "Batch Generate Resi"
- [ ] Semua resi berhasil dibuat
- [ ] Summary menampilkan hasil yang benar
- [ ] Tidak ada order yang terlewat

### Test Error Handling:

- [ ] Generate resi untuk order yang sudah punya resi → Error
- [ ] Generate resi untuk order selain PAID → Error
- [ ] Generate resi tanpa alamat → Error
- [ ] Biteship API error → Handled dengan graceful error message

---

## 📈 Benefits

### Untuk Admin:
- ✅ **Kontrol penuh** atas kapan resi dibuat
- ✅ **Cek stok** sebelum commit ke kurir
- ✅ **Batch processing** untuk efisiensi
- ✅ **Kurangi kesalahan** alamat/produk
- ✅ **Koordinasi pickup** lebih mudah

### Untuk Business:
- ✅ **Hemat biaya** - tidak ada resi terbuang
- ✅ **Customer service** lebih baik - bisa handle edge cases sebelum kirim
- ✅ **Flexible scheduling** - bisa atur waktu pickup sesuai kebutuhan
- ✅ **Better inventory management** - cek stok real sebelum generate resi

### Untuk Customer:
- ✅ **Transparansi** - tau kapan pesanan diproses
- ✅ **Akurasi** - admin validasi dulu sebelum kirim
- ✅ **Komunikasi** - bisa koordinasi dengan CS jika ada masalah

---

## 🚀 Next Steps (Optional Enhancements)

### Phase 2:
- [ ] Admin authentication & authorization
- [ ] Role-based access (admin, packer, etc.)
- [ ] Manual resi input (untuk kurir non-Biteship)
- [ ] Print label resi dalam batch
- [ ] Notifikasi ke customer saat resi dibuat
- [ ] Dashboard analytics (order per hari, dll)
- [ ] Export order data ke CSV

### Phase 3:
- [ ] Inventory integration
- [ ] Auto-schedule pickup dengan kurir
- [ ] SMS notification untuk customer
- [ ] Mobile app untuk packer
- [ ] Barcode scanning untuk packing

---

## 🐛 Troubleshooting

### Issue: Resi tidak terbuat saat generate
**Solution:**
1. Cek log console untuk error dari Biteship API
2. Validasi alamat customer (postal code, province, city)
3. Cek Biteship API key & credentials
4. Test manual via Postman

### Issue: Batch generate gagal sebagian
**Solution:**
1. Lihat summary response untuk detail error per order
2. Review order yang gagal secara individual
3. Generate ulang yang gagal setelah fix issue

### Issue: Customer komplain resi lama dibuat
**Solution:**
1. Set SLA internal (misal: resi dibuat max 1x24 jam)
2. Tambah auto-notification ke admin jika ada order > 12 jam belum diproses
3. Komunikasikan ke customer tentang processing time

---

## 📞 Support

Jika ada pertanyaan atau issue:
1. Check logs di browser console
2. Check server logs untuk Biteship API response
3. Test via API endpoint langsung menggunakan Postman
4. Review code di `src/server/tripay.ts` dan `src/app/api/admin/`

---

**Last Updated:** 2025
**System Version:** 2.0 (Draft Order System)
