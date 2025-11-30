# 📮 Generate Resi via Postman - Step by Step

## Order Information
```
UUID: 745f60e7-60bc-496a-8fc8-4ef6455cbe10
Order Number: DEV-T44456307467JGRLA
Status: paid (Draft Order - Belum ada resi)
```

---

## 🚀 Langkah-langkah di Postman:

### **Step 1: Buka Postman**

1. Buka aplikasi Postman
2. Klik **"New"** → **"HTTP Request"**

---

### **Step 2: Setup Request**

**Method:** `POST`

**URL:**
```
http://localhost:3000/api/admin/generate-resi
```

---

### **Step 3: Setup Headers**

Klik tab **"Headers"**, tambahkan:

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |

---

### **Step 4: Setup Body**

1. Klik tab **"Body"**
2. Pilih **"raw"**
3. Pilih **"JSON"** di dropdown sebelah kanan
4. Paste JSON ini:

```json
{
  "orderId": "745f60e7-60bc-496a-8fc8-4ef6455cbe10"
}
```

---

### **Step 5: Send Request**

1. Klik tombol **"Send"**
2. Tunggu response (biasanya 2-5 detik karena panggil Biteship API)

---

## ✅ Expected Response (Success):

```json
{
  "success": true,
  "data": {
    "orderId": "745f60e7-60bc-496a-8fc8-4ef6455cbe10",
    "waybill": "JNE1234567890XX",
    "trackingUrl": "https://biteship.com/tracking/...",
    "courier": {
      "code": "jne",
      "service": "reg"
    }
  }
}
```

**HTTP Status:** `200 OK`

---

## ❌ Possible Errors:

### Error 1: Order sudah punya resi
```json
{
  "error": "Resi sudah dibuat sebelumnya",
  "resi": "JNE1234567890XX"
}
```
**HTTP Status:** `400 Bad Request`

---

### Error 2: Order bukan status PAID
```json
{
  "error": "Order harus berstatus PAID untuk generate resi",
  "currentStatus": "processing"
}
```
**HTTP Status:** `400 Bad Request`

---

### Error 3: Order tidak ditemukan
```json
{
  "error": "Order not found"
}
```
**HTTP Status:** `404 Not Found`

---

### Error 4: Biteship API gagal
```json
{
  "error": "Gagal membuat shipment di Biteship",
  "message": "Invalid address",
  "details": { ... }
}
```
**HTTP Status:** `500 Internal Server Error`

---

## 🔍 Verify Hasil Generate Resi

Setelah sukses generate resi, jalankan script ini untuk verify:

```bash
node get_order_for_postman.js
```

**Expected Output:**
```
✅ Order ditemukan:
=====================================
UUID: 745f60e7-60bc-496a-8fc8-4ef6455cbe10
Order Number: DEV-T44456307467JGRLA
Status: processing  ← Berubah dari 'paid'
Resi: JNE1234567890XX  ← Dapat nomor resi
Shipping Status: Pesanan sedang dikemas
=====================================
```

---

## 📊 Perubahan di Database Setelah Generate Resi

| Kolom | Before | After |
|-------|--------|-------|
| `status` | `'paid'` | `'processing'` |
| `shipping_resi` | `'Menunggu konfirmasi admin'` | `'JNE1234567890XX'` |
| `shipping_status` | `'Pembayaran berhasil, pesanan sedang diproses'` | `'Pesanan sedang dikemas'` |
| `shipping_address_json` | `{...}` | `{..., biteship: {...}}` (ditambah data Biteship) |

---

## 🎯 Postman Collection (Import Ready)

Save JSON ini sebagai file `.json` dan import ke Postman:

```json
{
  "info": {
    "name": "Meoris Admin - Generate Resi",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Generate Resi - Single Order",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"orderId\": \"745f60e7-60bc-496a-8fc8-4ef6455cbe10\"\n}"
        },
        "url": {
          "raw": "http://localhost:3000/api/admin/generate-resi",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "admin", "generate-resi"]
        }
      }
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Problem: "Order not found"
**Solution:** Cek UUID sudah benar dengan jalankan `node get_order_for_postman.js`

### Problem: "Order harus berstatus PAID"
**Solution:** Order mungkin sudah di-generate sebelumnya. Cek statusnya.

### Problem: Connection refused / 500 error
**Solution:**
1. Pastikan `npm run dev` sedang running
2. Cek console log server untuk error detail
3. Cek Biteship API key di `.env.local`

### Problem: Biteship API error "Invalid address"
**Solution:**
1. Cek data alamat lengkap (postal code, city, province)
2. Cek order detail di halaman user purchase
3. Pastikan courier service tersedia untuk area tujuan

---

## ⏭️ Next Steps Setelah Generate Resi

1. **Check order detail page:**
   ```
   http://localhost:3000/user/purchase?view=order-detail&order=DEV-T44456307467JGRLA
   ```
   Seharusnya sekarang muncul:
   - Nomor resi
   - Tombol "Lacak Pengiriman"
   - Status "Processing"

2. **Simulate shipping update:**
   - Untuk simulasi, Anda bisa manual update status ke `'shipped'` via SQL
   - Atau tunggu webhook dari Biteship (real scenario)

3. **Test tracking:**
   - Klik tombol "Lacak Pengiriman" di order detail
   - Akan redirect ke tracking page Biteship

---

**Last Updated:** 2025-11-10
