# 📮 Testing API Returns dengan Postman

## Step-by-Step Guide

### 1️⃣ **Buka Postman**
- Download Postman dari https://www.postman.com/downloads/ (jika belum punya)
- Buka aplikasi Postman

---

### 2️⃣ **Create New Request**

1. Klik tombol **"New"** atau **"+"** untuk buat request baru
2. Pilih **"HTTP Request"**

---

### 3️⃣ **Setup Request**

#### **Method & URL:**
- **Method:** Pilih `POST` dari dropdown
- **URL:** 
  ```
  http://localhost:3000/api/returns/approve
  ```
  
  Atau untuk production:
  ```
  https://sandal-shop-3.preview.emergentagent.com/api/returns/approve
  ```

![Postman Method](https://i.imgur.com/example1.png)

---

### 4️⃣ **Setup Headers**

1. Klik tab **"Headers"**
2. Add header baru:
   - **Key:** `Content-Type`
   - **Value:** `application/json`

| Key          | Value            |
|--------------|------------------|
| Content-Type | application/json |

---

### 5️⃣ **Setup Body (Request Payload)**

1. Klik tab **"Body"**
2. Pilih **"raw"**
3. Pilih format **"JSON"** dari dropdown di kanan
4. Masukkan JSON payload:

```json
{
  "return_id": "PASTE_RETURN_ID_DISINI"
}
```

**Contoh dengan ID nyata:**
```json
{
  "return_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 6️⃣ **Dapatkan Return ID dari Database**

#### **Cara 1: Via Supabase Dashboard**
1. Login ke Supabase: https://supabase.com/dashboard
2. Pilih project **Meoris Sandal**
3. Buka **SQL Editor**
4. Jalankan query:

```sql
SELECT id, order_number, reason, status, created_at 
FROM returns 
WHERE status = 'pending' 
ORDER BY created_at DESC
LIMIT 5;
```

5. Copy `id` dari hasil query
6. Paste ke Body di Postman

#### **Cara 2: Via Database Client**
- Gunakan tools seperti DBeaver, pgAdmin, atau TablePlus
- Connect ke database Supabase
- Query seperti di atas

---

### 7️⃣ **Send Request**

1. Klik tombol besar **"Send"** (warna biru)
2. Tunggu response muncul di bawah

---

### 8️⃣ **Check Response**

#### ✅ **Success Response (Status: 200 OK)**

```json
{
  "success": true,
  "message": "Return berhasil di-approve dan resi JNT telah digenerate",
  "data": {
    "return_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "approved",
    "waybill": "JNT1234567890",
    "tracking_url": "https://www.jnt.com/tracking?waybill=JNT1234567890",
    "courier": "J&T Express",
    "pickup_address": "Jl. Merdeka No 123, Kec. Bandung Wetan, Kota Bandung, Jawa Barat",
    "destination": "Meoris Warehouse, Tasikmalaya"
  }
}
```

**Lihat di tab "Body":**
- Status Code: `200 OK` (warna hijau)
- Response Time: ~2-5 detik
- Size: ~400-500 bytes

**Yang penting:**
- ✅ `success: true`
- ✅ `waybill`: Nomor resi JNT (simpan ini!)
- ✅ `tracking_url`: URL untuk tracking

---

#### ❌ **Error Responses**

**1. Return Not Found (404)**
```json
{
  "success": false,
  "message": "Return request not found"
}
```
**Fix:** Cek return_id yang dimasukkan, pastikan valid

---

**2. Already Approved (400)**
```json
{
  "success": false,
  "message": "Return already approved",
  "waybill": "JNT1234567890"
}
```
**Fix:** Return sudah di-approve sebelumnya, cek waybill yang sudah ada

---

**3. Incomplete Address (400)**
```json
{
  "success": false,
  "message": "Alamat user tidak lengkap. Pastikan alamat dan kode pos tersedia."
}
```
**Fix:** User belum lengkapi alamat, minta user update profile

---

**4. Biteship API Error (500)**
```json
{
  "success": false,
  "message": "Gagal membuat resi pengembalian via Biteship",
  "error": {
    "success": false,
    "message": "Invalid postal code"
  }
}
```
**Fix:** 
- Cek BITESHIP_API_KEY di `.env.local`
- Pastikan kode pos user valid
- Cek Biteship dashboard untuk detail error

---

### 9️⃣ **Save Request (Optional)**

1. Klik **"Save"** atau `Ctrl+S`
2. Beri nama: `Approve Return - Generate JNT Resi`
3. Pilih atau buat Collection baru: `Meoris API`
4. Klik **"Save"**

Jadi nanti bisa re-use tanpa setup ulang!

---

### 🔟 **Test Multiple Returns**

Jika mau approve banyak returns sekaligus:

1. **Duplicate request** (klik ... → Duplicate)
2. **Ganti return_id** di Body
3. **Send**
4. Repeat untuk setiap return yang pending

---

## 📸 Screenshot Contoh

### **Setup Request:**
```
┌────────────────────────────────────────────────┐
│ POST ▼  http://localhost:3000/api/returns/... │
├────────────────────────────────────────────────┤
│ Params  Authorization  Headers  Body  ...      │
├────────────────────────────────────────────────┤
│                                                 │
│ Headers:                                        │
│ ┌──────────────┬────────────────┬─────────┐   │
│ │ Key          │ Value          │ ...     │   │
│ ├──────────────┼────────────────┼─────────┤   │
│ │ Content-Type │ application/json│ ✓      │   │
│ └──────────────┴────────────────┴─────────┘   │
│                                                 │
│ Body: ○ none  ⦿ raw  ○ ...        JSON ▼      │
│ ┌─────────────────────────────────────────┐   │
│ │ {                                        │   │
│ │   "return_id": "550e8400-..."           │   │
│ │ }                                        │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│                       [ Send ] ←────────────   │
└────────────────────────────────────────────────┘
```

### **Success Response:**
```
┌────────────────────────────────────────────────┐
│ Status: 200 OK    Time: 2.3s    Size: 420 B   │
├────────────────────────────────────────────────┤
│ Body  Cookies  Headers  Test Results  ...      │
├────────────────────────────────────────────────┤
│                                                 │
│ {                                               │
│   "success": true,                              │
│   "message": "Return berhasil di-approve...",  │
│   "data": {                                     │
│     "return_id": "550e8400-...",               │
│     "status": "approved",                       │
│     "waybill": "JNT1234567890",  ← IMPORTANT!  │
│     "tracking_url": "https://...",             │
│     "courier": "J&T Express",                   │
│     ...                                         │
│   }                                             │
│ }                                               │
│                                                 │
└────────────────────────────────────────────────┘
```

---

## 🎯 Quick Test Checklist

- [ ] Method: `POST` ✅
- [ ] URL: `http://localhost:3000/api/returns/approve` ✅
- [ ] Header: `Content-Type: application/json` ✅
- [ ] Body: Format JSON dengan `return_id` ✅
- [ ] return_id: Valid dari database ✅
- [ ] Click Send ✅
- [ ] Check response: Status 200 & waybill ada ✅
- [ ] Save waybill untuk diberikan ke user ✅

---

## 🚨 Troubleshooting

### Problem: "Could not send request"
**Solution:**
- Pastikan Next.js server running: `supervisorctl status nextjs`
- Pastikan URL benar (localhost:3000 atau production URL)
- Cek firewall/antivirus tidak block Postman

### Problem: "Error: connect ECONNREFUSED"
**Solution:**
- Server belum start atau crash
- Restart: `supervisorctl restart nextjs`
- Cek logs: `tail -f /var/log/supervisor/nextjs.err.log`

### Problem: Response lambat (>10 detik)
**Solution:**
- Biteship API mungkin lambat
- Cek koneksi internet
- Tunggu sampai selesai, jangan cancel

---

## 💡 Pro Tips

1. **Save to Collection:** Simpan request ke collection agar mudah re-use
2. **Environment Variables:** Buat environment untuk localhost & production
3. **Tests Tab:** Bisa tambah automated test di tab "Tests"
4. **Pre-request Script:** Bisa auto-generate timestamp atau random ID
5. **History:** Postman save semua request history, bisa re-run dari situ

---

## 📞 Butuh Help?

Jika masih error:
1. Screenshot error di Postman
2. Copy full error message
3. Cek server logs
4. Hubungi tim support

---

Ready to test! 🚀
