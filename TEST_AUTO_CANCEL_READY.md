# ✅ AUTO-CANCEL TEST - READY TO TEST!

## 📊 TEST ORDER STATUS

**Order Reference**: `DEV-T44456309561UDYFM`
- **Status Current**: `submitted` (Belum dibayar)
- **Deadline**: 18 November 2025 pukul **11:54 WIB**
- **Current Time**: 18 November 2025 pukul **11:56 WIB**
- **⚠️ EXPIRED**: 3 menit yang lalu

✅ **ORDER SIAP UNTUK DI-TEST!**

---

## 🧪 CARA TEST DI UBUNTU SERVER

### Test 1: Manual Trigger Cron Endpoint

Jalankan command ini di Ubuntu:

```bash
curl -H "Authorization: Bearer K3mP9xR7vN2sL5qW8tY4zH6jD1cF0aB3==" \
  http://localhost:3005/api/cron/auto-cancel-pending-orders
```

### ✅ EXPECTED RESULT (SUCCESS):

```json
{
  "success": true,
  "message": "Auto-cancel pending orders job executed successfully",
  "ordersCancelled": 1,
  "timestamp": "2025-11-18T04:56:..."
}
```

**Yang penting: `"ordersCancelled": 1`** (bukan 0!)

### ❌ FAILED RESULT:

```json
{
  "success": true,
  "ordersCancelled": 0,  ← Jika masih 0, ada masalah
  "timestamp": "..."
}
```

---

## 🔍 VERIFICATION SETELAH TEST

### Option 1: Check via Website
1. Buka: https://meoris.id/user/purchase?view=order-detail&order=DEV-T44456309561UDYFM
2. Status harus berubah menjadi **"Dibatalkan"**
3. Tidak lagi ada warning "Selesaikan pembayaran Anda"

### Option 2: Check via Script (Windows)
```bash
node verify_order_DEV-T44456309561UDYFM.js
```

Expected output:
```
📊 ORDER STATUS:
   ✅ CANCELLED - Auto-cancel worked!
```

### Option 3: Check Cron Logs (Ubuntu)
```bash
tail -20 /var/log/meoris-cron.log
```

Look for:
```
"ordersCancelled":1
```

---

## 📋 SUCCESS CHECKLIST

Setelah run command curl, cek:

- [ ] Response menunjukkan `"ordersCancelled": 1`
- [ ] Order status di database berubah `submitted` → `cancelled`
- [ ] Website menampilkan status "Dibatalkan"
- [ ] Order tidak muncul di list "Belum dibayar"

---

## 🎯 JIKA TEST BERHASIL

✅ **Auto-cancel system 100% WORKING!**

Artinya:
- Cron job bekerja dengan baik
- Database function correct
- API endpoint correct
- Semua order expired akan auto-cancelled setiap 10 menit

**TIDAK ADA ACTION LAGI YANG DIPERLUKAN** - sistem berjalan otomatis!

---

## 🐛 JIKA TEST GAGAL (ordersCancelled: 0)

Kemungkinan masalah:
1. SQL fix belum ter-apply dengan benar di Supabase
2. Function masih menggunakan kode lama

**Fix**: Re-apply `FINAL_SQL_FIX.sql` ke Supabase Dashboard

---

## 📊 ADDITIONAL TESTS (Optional)

### Test 2: Check All Expired Orders
```bash
node check_all_expired_orders.js
```

### Test 3: Wait for Automatic Cron (Every 10 Minutes)
Just wait and check logs:
```bash
tail -f /var/log/meoris-cron.log
```

At the next 10-minute mark (12:00, 12:10, 12:20, etc.), you should see:
```
{"ordersCancelled":1,...}
```

---

## 🚀 READY TO TEST NOW!

**Current Status:**
- ✅ Order created and expired
- ✅ Database function working (tested)
- ✅ API endpoint ready
- ✅ Cron job configured

**Just run the curl command on Ubuntu and check the result!**

---

**Expected Time**: 10 seconds to run test
**Success Rate**: Should be 100% (function already tested and working)
