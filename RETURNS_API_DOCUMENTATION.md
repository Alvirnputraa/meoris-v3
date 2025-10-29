# 📦 API Pengembalian Barang - Auto Generate Resi JNT

## Overview
API ini digunakan untuk **approve permintaan pengembalian barang** dan **auto-generate resi JNT** via Biteship.

---

## 🔧 Endpoint

```
POST /api/returns/approve
```

---

## 📥 Request

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "return_id": "uuid-dari-return-request"
}
```

### Example cURL
```bash
curl -X POST https://sandal-market-1.preview.emergentagent.com/api/returns/approve \
  -H "Content-Type: application/json" \
  -d '{
    "return_id": "12345678-1234-1234-1234-123456789abc"
  }'
```

---

## 📤 Response

### ✅ Success Response (200)
```json
{
  "success": true,
  "message": "Return berhasil di-approve dan resi JNT telah digenerate",
  "data": {
    "return_id": "12345678-1234-1234-1234-123456789abc",
    "status": "approved",
    "waybill": "JNT1234567890",
    "tracking_url": "https://track.jnt.com/...",
    "courier": "J&T Express",
    "pickup_address": "Jl. Raya No 123, Kec. Sukabumi, Kota Bandung, Jawa Barat",
    "destination": "Meoris Warehouse, Tasikmalaya"
  }
}
```

### ❌ Error Responses

#### Return Not Found (404)
```json
{
  "success": false,
  "message": "Return request not found"
}
```

#### Already Approved (400)
```json
{
  "success": false,
  "message": "Return already approved",
  "waybill": "JNT1234567890"
}
```

#### Incomplete Address (400)
```json
{
  "success": false,
  "message": "Alamat user tidak lengkap. Pastikan alamat dan kode pos tersedia."
}
```

#### Biteship Error (500)
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

---

## 🔄 Flow Kerja

1. **Terima request** dengan `return_id`
2. **Fetch data** return + order + user address dari database
3. **Validasi** alamat user (harus ada alamat & kode pos)
4. **Generate resi JNT** via Biteship API:
   - **Origin (Pickup):** Alamat user yang return barang
   - **Destination:** Alamat toko Meoris (Tasikmalaya)
   - **Courier:** J&T Express (JNT)
5. **Update database:**
   - Status → `approved`
   - `return_waybill` → Nomor resi JNT
   - `notes` → "Resi JNT: {waybill}"
6. **Return response** dengan detail resi & tracking URL

---

## 🗄️ Database Changes

Tabel `returns` sudah ditambahkan kolom baru:

```sql
ALTER TABLE returns ADD COLUMN return_waybill TEXT;
```

### Kolom Terkait:
- `return_waybill`: Nomor resi JNT yang digenerate
- `status`: pending → **approved** → returned → completed
- `notes`: Info tambahan tentang resi

---

## 📋 Cara Menggunakan

### 1. Dapatkan Return ID
Query database untuk list returns yang pending:

```sql
SELECT id, user_id, order_number, reason, status, created_at 
FROM returns 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

### 2. Approve via API
Gunakan `return_id` dari query di atas:

```bash
curl -X POST http://localhost:3000/api/returns/approve \
  -H "Content-Type: application/json" \
  -d '{
    "return_id": "COPY_RETURN_ID_DISINI"
  }'
```

### 3. Cek Response
Jika sukses, simpan **waybill number** dan **tracking URL** untuk diberikan ke user.

---

## 🧪 Testing

### Test di Localhost
```bash
# Replace dengan return_id yang valid dari database
curl -X POST http://localhost:3000/api/returns/approve \
  -H "Content-Type: application/json" \
  -d '{"return_id": "your-return-id-here"}' \
  | json_pp
```

### Test di Production
```bash
curl -X POST https://sandal-market-1.preview.emergentagent.com/api/returns/approve \
  -H "Content-Type: application/json" \
  -d '{"return_id": "your-return-id-here"}' \
  | json_pp
```

---

## 🔍 Troubleshooting

### Issue: "Alamat user tidak lengkap"
**Solusi:** 
- Pastikan order memiliki `shipping_address` yang lengkap
- Atau pastikan user profile punya `shipping_street` + `shipping_postal_code`

### Issue: "Gagal membuat resi pengembalian via Biteship"
**Solusi:**
- Cek BITESHIP_API_KEY di `.env.local`
- Pastikan API key valid dan tidak expired
- Cek log error untuk detail dari Biteship

### Issue: "Return not found"
**Solusi:**
- Pastikan return_id valid dan ada di database
- Query: `SELECT * FROM returns WHERE id = 'your-id'`

---

## 📝 Notes

- **Courier tetap:** Selalu menggunakan J&T Express untuk return
- **Auto-approve:** Ketika hit API ini, status langsung jadi `approved`
- **Waybill disimpan:** Nomor resi disimpan di kolom `return_waybill`
- **Tidak bisa approve 2x:** Jika sudah ada waybill, akan error

---

## 🚀 Next Steps (Optional)

Jika butuh UI admin, bisa buat halaman sederhana di `/admin/returns` yang:
1. List semua returns dengan status pending
2. Button "Approve" yang call API ini
3. Display waybill setelah approve

---

## 📞 Support

Jika ada masalah, cek:
- Server logs: `tail -f /var/log/supervisor/nextjs.out.log`
- Error logs: `tail -f /var/log/supervisor/nextjs.err.log`
- Biteship dashboard: https://app.biteship.com/
