# Testing Link "Cek Disini" di Semua Halaman

## ⚠️ PENTING: Port Number

Anda menyebutkan menggunakan `http://localhost:3001`, tapi dev server yang saya jalankan ada di `http://localhost:3000`.

**Silakan sesuaikan port number:**
- Jika Anda pakai port 3001, ganti semua URL di bawah dari `:3000` ke `:3001`
- Atau stop server di port 3001 dan gunakan server di port 3000

---

## 🔄 Restart Dev Server (PENTING!)

Karena ada banyak perubahan file, **WAJIB restart dev server** untuk memastikan semua perubahan ter-load:

```bash
# 1. Stop dev server yang sekarang (Ctrl+C di terminal)

# 2. Clear cache dan rebuild (recommended)
cd "C:\Users\Administrator\Downloads\meoris-v3-main"
clear_and_rebuild.bat

# ATAU jika script tidak work, manual:
# Kill all Node.js processes
taskkill /F /IM node.exe

# Remove .next folder
rmdir /s /q .next

# Rebuild
npm run build

# Start dev server
npm run dev
```

---

## 🧪 Test Case untuk Setiap Halaman

### ✅ 1. Test di Halaman Home

**URL:** `http://localhost:3000/` atau `http://localhost:3000/home`

**Steps:**
1. Buka URL di browser
2. Lihat banner hitam di paling atas
3. Hover ke teks "cek disini"
   - ✅ Cursor berubah jadi pointer (tangan)
   - ✅ Warna teks berubah lebih terang
4. Klik "cek disini"
   - ✅ Halaman scroll smooth ke section "Voucher Spesial Untuk Anda"
   - ✅ URL **TETAP** di `/` (tidak berubah)
   - ✅ Tidak ada navigation (tetap di halaman yang sama)

**Expected Result:**
```
✅ Cursor pointer saat hover
✅ Hover effect (warna berubah)
✅ Smooth scroll ke voucher section
✅ URL tidak berubah
```

---

### ✅ 2. Test di Halaman Detail Produk

**URL:** `http://localhost:3000/produk/fa0a038704a24547bf58cfac87ed9d58/detail`

**Steps:**
1. Buka URL di browser
2. Lihat banner hitam di paling atas
3. Hover ke teks "cek disini"
   - ✅ Cursor berubah jadi pointer
   - ✅ Warna teks berubah lebih terang
4. Klik "cek disini"
   - ✅ Browser navigate ke halaman home
   - ✅ URL berubah jadi `http://localhost:3000/#voucher-section`
   - ✅ Halaman auto-scroll smooth ke section "Voucher Spesial Untuk Anda"

**Expected Result:**
```
✅ Cursor pointer saat hover
✅ Hover effect (warna berubah)
✅ Navigate ke home
✅ URL berubah jadi /#voucher-section
✅ Auto-scroll ke voucher section
```

---

### ✅ 3. Test di Halaman Produk List

**URL:** `http://localhost:3000/produk`

**Steps:**
1. Buka URL di browser
2. Lihat banner hitam di paling atas
3. Hover ke teks "cek disini"
   - ✅ Cursor berubah jadi pointer
   - ✅ Warna teks berubah lebih terang
4. Klik "cek disini"
   - ✅ Browser navigate ke halaman home
   - ✅ URL berubah jadi `http://localhost:3000/#voucher-section`
   - ✅ Halaman auto-scroll smooth ke section "Voucher Spesial Untuk Anda"

**Expected Result:**
```
✅ Cursor pointer saat hover
✅ Hover effect (warna berubah)
✅ Navigate ke home
✅ URL berubah jadi /#voucher-section
✅ Auto-scroll ke voucher section
```

---

### ✅ 4. Test di Halaman Checkout

**URL:** `http://localhost:3000/produk/checkout?pra_checkout_id=e275da01-0cec-4317-89f6-585988d0c76e`

**Notes:**
- Ganti `pra_checkout_id` dengan ID yang valid dari database Anda
- Atau buat checkout baru dari halaman produk

**Steps:**
1. Buka URL di browser (atau proses checkout dari produk)
2. Lihat banner hitam di paling atas
3. Hover ke teks "cek disini"
   - ✅ Cursor berubah jadi pointer
   - ✅ Warna teks berubah lebih terang
4. Klik "cek disini"
   - ✅ Browser navigate ke halaman home
   - ✅ URL berubah jadi `http://localhost:3000/#voucher-section`
   - ✅ Halaman auto-scroll smooth ke section "Voucher Spesial Untuk Anda"

**Expected Result:**
```
✅ Cursor pointer saat hover
✅ Hover effect (warna berubah)
✅ Navigate ke home
✅ URL berubah jadi /#voucher-section
✅ Auto-scroll ke voucher section
```

---

### ✅ 5. Test di Halaman User Purchase

**URL:** `http://localhost:3000/user/purchase?pesanan-saya=all`

**Notes:** Perlu login dulu sebagai user

**Steps:**
1. Login ke aplikasi
2. Buka URL di browser
3. Lihat banner hitam di paling atas
4. Hover ke teks "cek disini"
   - ✅ Cursor berubah jadi pointer
   - ✅ Warna teks berubah lebih terang
5. Klik "cek disini"
   - ✅ Browser navigate ke halaman home
   - ✅ URL berubah jadi `http://localhost:3000/#voucher-section`
   - ✅ Halaman auto-scroll smooth ke section "Voucher Spesial Untuk Anda"

**Expected Result:**
```
✅ Cursor pointer saat hover
✅ Hover effect (warna berubah)
✅ Navigate ke home
✅ URL berubah jadi /#voucher-section
✅ Auto-scroll ke voucher section
```

---

## 🔍 Troubleshooting

### Masalah: "Masih tidak bisa diklik"

**Solusi:**

1. **Clear browser cache:**
   ```
   Ctrl + Shift + Delete → Clear cached images and files
   ```

2. **Hard reload:**
   ```
   Ctrl + F5
   ```

3. **Test di Incognito:**
   ```
   Ctrl + Shift + N (Chrome/Edge)
   Ctrl + Shift + P (Firefox)
   ```

4. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   # Run clear_and_rebuild.bat
   cd "C:\Users\Administrator\Downloads\meoris-v3-main"
   clear_and_rebuild.bat
   ```

5. **Check console errors:**
   ```
   F12 → Console tab
   Lihat apakah ada error JavaScript
   ```

---

### Masalah: "Hover effect tidak muncul"

**Check:**
- Apakah cursor berubah jadi pointer? Jika ya, berarti code sudah ter-load
- Clear cache browser dan hard reload (Ctrl + F5)
- Pastikan dev server sudah restart setelah perubahan

---

### Masalah: "Scroll tidak smooth"

**Check:**
- Buka Developer Tools (F12)
- Pergi ke Console tab
- Cari log: `[Section Scroll] Attempting to scroll to: voucher-section`
- Jika tidak ada log, berarti onClick handler belum ter-trigger

---

### Masalah: "Dev server tidak running di port yang benar"

**Check port yang digunakan:**
```bash
# Lihat output saat start dev server:
# Local: http://localhost:3000 atau 3001?
```

**Jika port berbeda:**
- Ganti semua URL test dari `:3000` ke port yang benar
- Atau set port manual di package.json:
  ```json
  "dev": "next dev -p 3001"
  ```

---

## ✅ Checklist Verifikasi

Setelah semua test, pastikan:

- [ ] Semua 5 halaman banner "cek disini" bisa diklik
- [ ] Hover effect bekerja di semua halaman (pointer + warna berubah)
- [ ] Halaman home scroll langsung ke voucher (tidak navigate)
- [ ] Halaman lain navigate dulu ke home, baru scroll ke voucher
- [ ] URL berubah jadi `/#voucher-section` saat klik dari halaman lain
- [ ] Smooth scroll bekerja dengan baik
- [ ] Tidak ada error di console browser
- [ ] Voucher section terlihat dengan offset yang pas (tidak tertutup header)

---

## 📊 Summary Test Results

| Halaman | Hover | Click | Navigate | Scroll | Status |
|---------|-------|-------|----------|--------|--------|
| Home | ✅ | ✅ | ❌ (direct scroll) | ✅ | ⬜ |
| Detail Produk | ✅ | ✅ | ✅ | ✅ | ⬜ |
| Produk List | ✅ | ✅ | ✅ | ✅ | ⬜ |
| Checkout | ✅ | ✅ | ✅ | ✅ | ⬜ |
| User Purchase | ✅ | ✅ | ✅ | ✅ | ⬜ |

*Check (✅) kolom Status setelah test berhasil*

---

## 🚀 Deployment ke Production

Setelah semua test di localhost berhasil:

1. **Build untuk production:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   ```bash
   # Jika pakai Vercel:
   vercel --prod

   # Atau push ke Git dan auto-deploy
   git add .
   git commit -m "Add clickable 'cek disini' link on all pages"
   git push origin main
   ```

3. **Test di production:**
   - Clear browser cache
   - Test di Incognito mode
   - Test semua 5 halaman

---

## 📞 Need Help?

Jika masih ada masalah setelah:
- ✅ Restart dev server
- ✅ Clear cache browser
- ✅ Test di Incognito

Share info berikut:
1. Screenshot banner (hover dan normal state)
2. Console errors (F12 → Console)
3. Browser dan versi (Chrome 120, Firefox 121, etc)
4. Port number yang digunakan (3000 atau 3001?)
5. Halaman mana yang bermasalah

---

**Dev Server Running At:** `http://localhost:3000`

**Note:** Jika Anda menggunakan port 3001, pastikan untuk mengganti semua URL di atas.
