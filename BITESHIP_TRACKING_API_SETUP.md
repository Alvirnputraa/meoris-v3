# 🚀 Biteship Tracking API - Setup & Implementation

## ✅ Implementasi Selesai!

Tracking pengiriman sekarang menampilkan **detail lengkap dari Biteship API** seperti:
- ✅ "SHIPMENT RECEIVED BY JNE COUNTER OFFICER AT [JAKARTA]"
- ✅ "PROCESSED AT SORTING CENTER [JAKARTA HUB]"
- ✅ "WITH DELIVERY COURIER [NAMA KURIR]"
- ✅ "DELIVERED TO [PENERIMA | 01 Jan 2025 14:30]"

---

## 📁 File Yang Dibuat/Diubah:

| File | Status | Keterangan |
|------|--------|------------|
| `src/app/api/biteship/tracking/[waybillId]/route.ts` | ✅ Baru | API route untuk fetch tracking |
| `src/app/user/purchase/page.tsx` | ✅ Diubah | Load & tampilkan detail tracking |

---

## 🔧 Setup Environment Variables

Tambahkan API key Biteship ke file `.env.local`:

```env
# Biteship API Configuration
BITESHIP_API_KEY=your_biteship_api_key_here
BITESHIP_WEBHOOK_SECRET=your_webhook_secret_here
```

### Cara Dapat API Key:

1. Login ke **Biteship Dashboard**: https://panel.biteship.com
2. Buka menu **Settings** → **API Keys**
3. Copy **API Key** Anda
4. Paste ke `.env.local`

**Format API Key:**
```
biteship_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
atau untuk testing:
```
biteship_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🎯 Cara Kerja:

### **Flow Lengkap:**

```
User Buka Order Detail
       ↓
Frontend Check: Ada shipping_resi?
       ↓
[YES] Hit API: /api/biteship/tracking/{waybillId}
       ↓
Backend Call Biteship API
       ↓
[SUCCESS] Tampilkan Detail Tracking (Note lengkap)
       ↓
[FAILED] Fallback ke Database History (Status global)
```

### **Prioritas Data:**

1. **🥇 First Priority:** Biteship Tracking API (Detail lengkap)
2. **🥈 Fallback:** Database shipping_history (Status global)
3. **🥉 Last Resort:** "Belum ada riwayat tracking"

---

## 📊 Response Structure dari Biteship:

```json
{
  "success": true,
  "object": "tracking",
  "id": "biteship_tracking_id_xxx",
  "waybill_id": "JNE9876543210",
  "courier": {
    "company": "jne",
    "name": "JNE",
    "phone": "021xxxxxxx"
  },
  "origin": {
    "contact_name": "Toko ABC",
    "address": "Jl. Sudirman No. 123"
  },
  "destination": {
    "contact_name": "John Doe",
    "address": "Jl. Gatot Subroto No. 456"
  },
  "history": [
    {
      "note": "DELIVERED TO [JOHN DOE | 06 NOV 2025 14:30]",
      "updated_at": "2025-11-06T14:30:00+07:00",
      "status": "delivered"
    },
    {
      "note": "WITH DELIVERY COURIER [BUDI - 08123456789]",
      "updated_at": "2025-11-06T09:00:00+07:00",
      "status": "on_courier"
    },
    {
      "note": "PROCESSED AT SORTING CENTER [JAKARTA HUB]",
      "updated_at": "2025-11-06T05:00:00+07:00",
      "status": "on_process"
    },
    {
      "note": "SHIPMENT RECEIVED BY JNE COUNTER OFFICER AT [JAKARTA]",
      "updated_at": "2025-11-05T18:00:00+07:00",
      "status": "manifested"
    }
  ],
  "status": "delivered"
}
```

---

## 🧪 Testing

### **Test 1: Dengan Resi Real (Production)**

1. **Buat order** dan kirim barang via Biteship
2. **Dapat nomor resi** dari Biteship (contoh: JNE9876543210)
3. **Buka order detail** di frontend
4. **Lihat tracking** - harus tampil detail lengkap

### **Test 2: Manual API Test**

Test API endpoint langsung:

```bash
# Test with curl
curl http://localhost:3000/api/biteship/tracking/JNE9876543210
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "waybill_id": "JNE9876543210",
    "courier": { "name": "JNE" },
    "history": [...]
  }
}
```

### **Test 3: Error Handling**

**Scenario: Resi belum ada di sistem**
```bash
curl http://localhost:3000/api/biteship/tracking/FAKE123456
```

**Expected:** Frontend fallback ke database history

---

## 🎨 UI Features:

### **Loading State:**
```
⏳ Memuat detail tracking...
```

### **Success State (Biteship API):**
```
📦 Tracking Pengiriman
    No. Resi: JNE9876543210

    🟢 06 Nov 2025, 14:30
        DELIVERED TO [JOHN DOE | 06 NOV 2025 14:30]

    🔵 06 Nov 2025, 09:00
        WITH DELIVERY COURIER [BUDI - 08123456789]

    ⚪ 06 Nov 2025, 05:00
        PROCESSED AT SORTING CENTER [JAKARTA HUB]

    ⚪ 05 Nov 2025, 18:00
        SHIPMENT RECEIVED BY JNE COUNTER OFFICER
```

### **Fallback State (Database):**
```
📦 Tracking Pengiriman
    No. Resi: JNE9876543210

    🟢 06 Nov 2025, 14:30
        Terkirim

    🔵 06 Nov 2025, 09:00
        Dalam Pengiriman

    ⚪ 06 Nov 2025, 05:00
        Pesanan telah diserahkan ke jasa kirim
```

---

## ⚠️ Troubleshooting

### Issue: "Tracking service not configured"
**Solution:** Add `BITESHIP_API_KEY` to `.env.local`

### Issue: "Tracking not found"
**Possible Reasons:**
1. Resi belum tersedia di sistem Biteship (tunggu 1-2 jam)
2. Resi salah/typo
3. Ekspedisi belum input ke sistem mereka

**Action:** Frontend auto-fallback ke database history

### Issue: API timeout
**Solution:** Biteship API might be slow, frontend has 30s timeout

### Issue: Rate limit exceeded
**Solution:** Biteship has rate limits, consider caching in future

---

## 📈 Monitoring & Logs

**Backend Logs:**
```bash
# Success
✅ Tracking data fetched successfully

# Error
❌ Biteship API error: 404 Not Found
❌ Failed to fetch tracking data
```

**Frontend Logs (Browser Console):**
```bash
# Loading
Fetching detailed tracking for waybill: JNE9876543210

# Success
Detailed tracking loaded: {waybill_id: "JNE9876543210", ...}

# Fallback
Failed to fetch tracking: 404
```

---

## 🚀 Deployment Checklist

- [ ] Add `BITESHIP_API_KEY` to production environment
- [ ] Test with real waybill number
- [ ] Verify API key has tracking permission
- [ ] Monitor error logs for first week
- [ ] Set up alerting for high error rate

---

## 💡 Future Enhancements

1. **Caching:** Cache tracking data 15-30 minutes
2. **Refresh Button:** Manual refresh tracking
3. **Real-time Updates:** WebSocket for live tracking
4. **Delivery Photo:** Show proof of delivery (POD)
5. **Estimated Time:** Show ETA from Biteship

---

## 📞 Biteship API Docs

- **Tracking API:** https://biteship.com/docs/api/tracking
- **Dashboard:** https://panel.biteship.com
- **Support:** support@biteship.com

---

## ✅ Summary

| Feature | Status |
|---------|--------|
| Biteship Tracking API Integration | ✅ Done |
| Detailed Timeline Display | ✅ Done |
| Fallback to Database | ✅ Done |
| Loading State | ✅ Done |
| Error Handling | ✅ Done |
| Real-time Data | ✅ Done |

**Result:** User sekarang bisa lihat detail tracking lengkap seperti JNE/SiCepat tracking! 🎉
