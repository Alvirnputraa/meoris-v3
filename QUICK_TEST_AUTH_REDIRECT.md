# Quick Test: Auth & Authorization Redirect

## 🚀 Quick Start

Dev server sudah running di: `http://localhost:3000`

---

## ✅ Test 1: Authentication Check (Belum Login)

### Test Purchase Page

**Langkah:**
```
1. Buka Incognito window (Ctrl + Shift + N)
2. Akses: http://localhost:3000/user/purchase
```

**Expected:**
```
✅ Langsung redirect ke: http://localhost:3000/login
✅ Tidak ada error
✅ Tidak tampil konten purchase page
```

### Test Checkout Page

**Langkah:**
```
1. Di Incognito yang sama
2. Akses: http://localhost:3000/produk/checkout?pra_checkout_id=xxx
   (Ganti xxx dengan ID apa saja)
```

**Expected:**
```
✅ Langsung redirect ke: http://localhost:3000/login
✅ Tidak ada error
✅ Tidak tampil konten checkout page
```

**Status Test 1:** ⬜ Pass / ⬜ Fail

---

## ✅ Test 2: Authorized Access (User yang Benar)

### Setup
```
1. Tutup Incognito
2. Buka browser normal
3. Login ke aplikasi dengan user biasa
```

### Test Purchase Page

**Langkah:**
```
1. Setelah login
2. Akses: http://localhost:3000/user/purchase
```

**Expected:**
```
✅ Halaman purchase tampil normal
✅ Bisa lihat list orders
✅ Bisa switch tab (Semua, Belum Dibayar, dll)
```

**Test View Parameters:**
```
# Test semua query params:
http://localhost:3000/user/purchase?view=profile
http://localhost:3000/user/purchase?view=address
http://localhost:3000/user/purchase?view=vouchers
http://localhost:3000/user/purchase?view=notifications
```

**Expected:**
```
✅ Semua view tampil normal
✅ Tidak ada redirect
✅ Data profile/address/vouchers tampil
```

**Status Test 2:** ⬜ Pass / ⬜ Fail

---

## ✅ Test 3: Checkout Ownership (User Sendiri)

### Setup Checkout

**Langkah:**
```
1. Sudah login sebagai User A
2. Pergi ke: http://localhost:3000/produk
3. Pilih produk, klik "Beli Sekarang" atau "Tambah ke Keranjang"
4. Checkout → akan redirect ke halaman checkout dengan pra_checkout_id
5. Copy URL checkout yang muncul, contoh:
   http://localhost:3000/produk/checkout?pra_checkout_id=b4161b8b-021a-4617-93f2-09a46e048586
```

**Expected:**
```
✅ Halaman checkout tampil normal
✅ Bisa lihat produk yang mau dibeli
✅ Bisa pilih metode pembayaran
✅ Bisa proses ke payment
```

**Status Test 3:** ⬜ Pass / ⬜ Fail

---

## ⚠️ Test 4: Checkout Ownership (User Lain) - BLOCKED

### Setup 2 Users

**Option A: 2 Browser Berbeda**
```
Browser 1 (Chrome): Login sebagai User A
Browser 2 (Firefox): Login sebagai User B
```

**Option B: 2 Incognito Windows**
```
Window 1: Login sebagai User A
Window 2: Login sebagai User B
```

### Test Unauthorized Access

**Di Browser 1 (User A):**
```
1. Buat checkout dari produk
2. Copy URL checkout:
   http://localhost:3000/produk/checkout?pra_checkout_id=ABC123
```

**Di Browser 2 (User B):**
```
1. Paste URL checkout milik User A
2. Press Enter
```

**Expected:**
```
✅ User B langsung redirect ke: http://localhost:3000/home
✅ User B TIDAK bisa lihat checkout User A
✅ Tidak ada error
✅ Console (F12) menampilkan warning:
   "User trying to access another user's checkout"
```

**Console Log Expected:**
```javascript
User trying to access another user's checkout:
  praCheckoutUserId: "id-user-a"
  currentUserId: "id-user-b"
```

**Status Test 4:** ⬜ Pass / ⬜ Fail

---

## 🔍 Troubleshooting

### Issue: "Tidak redirect ke login saat belum login"

**Check:**
1. Restart dev server:
   ```bash
   Ctrl+C di terminal
   npm run dev
   ```
2. Clear browser cache (Ctrl + Shift + Delete)
3. Hard reload (Ctrl + F5)
4. Test di Incognito baru

---

### Issue: "User B bisa lihat checkout User A"

**Check:**
1. Pastikan kedua user benar-benar berbeda
2. Cek console, seharusnya ada warning log
3. Cek apakah `user.id` di database berbeda untuk User A dan User B
4. Restart dev server

**Debug:**
```
1. F12 → Console
2. Lihat log: "User trying to access another user's checkout"
3. Pastikan praCheckoutUserId ≠ currentUserId
```

---

### Issue: "Semua redirect ke home (bahkan user sendiri)"

**Possible Cause:** Bug di ownership check

**Check:**
```
1. Buka file: src/app/produk/checkout/page.tsx
2. Line 309: Pastikan ada:
   if (data && data.user_id && data.user_id !== user.id)
3. Bukan:
   if (data && data.user_id && data.user_id === user.id)  // ❌ Wrong
```

---

## 📊 Test Results Summary

| Test | Skenario | Expected | Result | Notes |
|------|----------|----------|--------|-------|
| 1 | Akses purchase tanpa login | Redirect /login | ⬜ | |
| 2 | Akses checkout tanpa login | Redirect /login | ⬜ | |
| 3 | User login akses purchase | Tampil normal | ⬜ | |
| 4 | User akses checkout sendiri | Tampil normal | ⬜ | |
| 5 | User B akses checkout User A | Redirect /home | ⬜ | |

**Overall Status:** ⬜ All Pass / ⬜ Has Issues

---

## 🎯 Expected Final Behavior

### ✅ PASS Conditions:

1. **Anonymous user** (belum login):
   - Akses `/user/purchase` → redirect `/login` ✅
   - Akses `/produk/checkout?xxx` → redirect `/login` ✅

2. **Logged in user** (User A):
   - Akses `/user/purchase` → tampil purchase page ✅
   - Akses checkout sendiri → tampil checkout ✅
   - Akses checkout User B → redirect `/home` ✅

3. **Console logs:**
   - Warning muncul saat unauthorized access ✅
   - No error di console ✅

### ❌ FAIL Conditions:

- User B bisa lihat checkout User A ❌
- Blank page / error page ❌
- No redirect saat seharusnya redirect ❌
- Redirect ke halaman yang salah ❌

---

## 🚀 Ready to Test?

**Commands:**
```bash
# Pastikan dev server running
npm run dev

# Jika perlu restart:
Ctrl+C
clear_and_rebuild.bat
```

**Browser:**
```
1. Test di Incognito untuk anonymous
2. Test di 2 browser untuk ownership check
3. Cek console (F12) untuk logs
```

**Documentation:**
- Full details: `AUTH_REDIRECT_IMPLEMENTATION.md`
- Quick reference: This file

---

**Dev Server:** `http://localhost:3000`
**Status:** Ready to test ✅

Good luck! 🎉
