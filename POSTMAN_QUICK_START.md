# 📮 POSTMAN QUICK START - 3 Langkah Mudah!

## 🎯 Method 1: Import Collection (RECOMMENDED - 1 Menit!)

### Step 1: Import Collection File
1. Buka Postman
2. Klik **"Import"** (pojok kiri atas)
3. Drag & drop file: `/app/Meoris_Returns_API.postman_collection.json`
4. Atau klik **"Upload Files"** → pilih file tersebut
5. Klik **"Import"**

### Step 2: Setup Environment (Optional)
1. Klik **"Environments"** (kiri sidebar)
2. Klik **"+"** untuk create environment baru
3. Nama: `Meoris Local`
4. Add variable:
   - Variable: `base_url`
   - Initial Value: `http://localhost:3000`
   - Current Value: `http://localhost:3000`
5. **Save**

Untuk production, buat environment lagi:
   - Variable: `base_url`
   - Value: `https://sandal-market-1.preview.emergentagent.com`

### Step 3: Test API
1. Pilih environment: `Meoris Local` dari dropdown (pojok kanan atas)
2. Buka collection: **"Meoris Returns API"**
3. Klik request: **"Approve Return & Generate JNT Resi"**
4. Di Body, ganti `PASTE_RETURN_ID_HERE` dengan return_id dari database
5. Klik **"Send"**
6. ✅ Done! Lihat response di bawah

---

## 🎯 Method 2: Manual Setup (3 Menit)

### 1️⃣ Create Request
- Method: **`POST`**
- URL: **`http://localhost:3000/api/returns/approve`**

### 2️⃣ Add Header
- Key: **`Content-Type`**
- Value: **`application/json`**

### 3️⃣ Add Body (raw JSON)
```json
{
  "return_id": "PASTE_RETURN_ID_DARI_DATABASE"
}
```

### 4️⃣ Click Send
- Lihat response: Status 200 = Success ✅
- Copy waybill number dari response

---

## 📋 Get Return ID dari Database

### Via Supabase Dashboard:
```
1. Login → supabase.com/dashboard
2. Pilih project Meoris
3. SQL Editor
4. Run query:
   SELECT id, order_number, status 
   FROM returns 
   WHERE status = 'pending';
5. Copy ID → paste ke Postman
```

---

## ✅ Success Response Example

```json
{
  "success": true,
  "data": {
    "waybill": "JNT1234567890",     ← SAVE THIS!
    "tracking_url": "https://...",
    "courier": "J&T Express"
  }
}
```

**Save waybill number!** Ini untuk tracking barang.

---

## ❌ Common Errors

| Error Message | Solusi |
|--------------|--------|
| "Return request not found" | return_id salah atau tidak ada |
| "Return already approved" | Sudah di-approve sebelumnya |
| "Alamat user tidak lengkap" | User belum isi alamat lengkap |
| "Could not send request" | Server belum running |

---

## 🚀 Super Quick Test

1. Import collection file ✅
2. Get return_id dari database ✅
3. Paste ke Body ✅
4. Click Send ✅
5. Get waybill ✅

**Total: < 2 menit!** 🎉

---

## 📞 Need Help?

Check:
- Server status: `supervisorctl status nextjs`
- Logs: `tail -f /var/log/supervisor/nextjs.out.log`
- Documentation: `/app/POSTMAN_TESTING_GUIDE.md` (lengkap)
