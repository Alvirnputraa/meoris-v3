# 🐛 Debug Tracking API Error 400

## Masalah:
- Error 400 saat fetch tracking
- Timeline masih tampil dari database (fallback)

## Penyebab Kemungkinan:

### 1. ❌ Order Tidak Punya shipping_resi
Order yang dibuka tidak punya nomor resi, jadi API call dengan waybill_id kosong/null.

**Check:**
```javascript
// Di browser console, cek:
console.log('Selected Order:', selectedOrder);
console.log('Shipping Resi:', selectedOrder?.shipping_resi);
```

**Expected:** Harus ada nomor resi, misal: `"JNE123456789"`

**Solution:**
- Update order dengan nomor resi real
- Atau test dengan order yang sudah ada resinya

### 2. ❌ Next.js Params Not Resolved
Next.js 15 menggunakan async params, sudah di-fix dengan `await params`.

### 3. ❌ Waybill ID Format Salah
Biteship expect format tertentu dari ekspedisi.

---

## ✅ Quick Fix Steps:

### Step 1: Update Order dengan Resi Real

Jalankan di Supabase SQL Editor:

```sql
-- Update order yang Anda test dengan nomor resi
UPDATE orders
SET shipping_resi = 'MASUKKAN_NOMOR_RESI_REAL_DISINI'
WHERE id = '3655dd39-b7a1-44c9-913c-896499c34d15';

-- Atau update by order_number
UPDATE orders
SET shipping_resi = 'MASUKKAN_NOMOR_RESI_REAL_DISINI'
WHERE order_number = 'DEV-T44456306531CZAIK';
```

### Step 2: Restart Dev Server

```bash
# Stop server (Ctrl+C)
# Start lagi
npm run dev
```

### Step 3: Test dengan Console Log

Buka browser console (F12) dan check logs:

```
📦 Tracking request for waybill: JNE123456789
✅ Tracking data fetched successfully
```

Atau error:
```
❌ Invalid waybill ID: undefined
```

---

## 🧪 Test Manual API:

Test API langsung tanpa frontend:

```bash
# Replace dengan nomor resi Anda
curl http://localhost:3000/api/biteship/tracking/JNE123456789
```

**Expected Success:**
```json
{
  "success": true,
  "data": {
    "waybill_id": "JNE123456789",
    "courier": { "name": "JNE" },
    "history": [...]
  }
}
```

**Expected Error (No Resi):**
```json
{
  "error": "Waybill ID is required"
}
```

---

## 🔍 Debug Checklist:

- [ ] Order punya `shipping_resi` (bukan null)
- [ ] Resi format valid (misal: JNE123456789)
- [ ] Dev server sudah restart
- [ ] BITESHIP_API_KEY ada di .env
- [ ] Browser console tidak ada error CORS
- [ ] Network tab: request ke /api/biteship/tracking/[resi]

---

## 💡 Temporary Workaround:

Kalau belum punya resi real, test dengan dummy data:

1. **Skip API call sementara**
2. **Tampilkan database history** (yang sekarang)
3. **Nanti kalau ada resi real**, baru test API

Atau gunakan nomor resi test dari Biteship:
- Cek di Biteship Dashboard
- Biasanya ada sample tracking untuk test

---

## 📞 Need Help?

Kalau masih error, share:
1. ✅ Value dari `selectedOrder.shipping_resi`
2. ✅ Console log lengkap
3. ✅ Network tab: request payload
