# 🔄 Clear Cache & Restart Dev Server

## Issue
Perubahan code tidak muncul di browser → Masih menampilkan versi lama

---

## ⚡ Quick Fix (3 Langkah)

### Step 1: Stop Dev Server
Di terminal tempat Next.js berjalan:
- Tekan **Ctrl + C**
- Tunggu sampai server benar-benar stop

### Step 2: Clear Next.js Cache
Di terminal, jalankan:

```bash
# Windows (PowerShell/CMD)
rmdir /s /q .next

# Atau manual: Hapus folder .next
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

---

## 🌐 Clear Browser Cache

### Cara 1: Hard Refresh (Recommended)
- **Chrome/Edge**: `Ctrl + Shift + R`
- **Firefox**: `Ctrl + Shift + R`
- **Safari**: `Cmd + Shift + R`

### Cara 2: Clear Cache Manual
1. Tekan **F12** (buka DevTools)
2. **Right-click** tombol Refresh di browser
3. Pilih **"Empty Cache and Hard Reload"**

### Cara 3: Clear All Cache
1. Tekan **Ctrl + Shift + Delete**
2. Pilih:
   - ✅ Cached images and files
   - ✅ Time range: Last hour
3. Klik **Clear data**

---

## ✅ Verify Changes

1. Restart dev server selesai
2. Clear browser cache selesai
3. Buka: `http://localhost:3000/user/purchase?view=order-detail&order=DEV-T44456308041SDO5Q`
4. **Harus muncul**:
   ```
   Pesanan Anda telah terkirim
   Pesanan akan terselesaikan otomatis pada 14 November 2025 pukul 14:30
   ```

**TIDAK BOLEH ADA**:
- ❌ "(2 hari lagi untuk mengajukan pengembalian)"

---

## 🐛 Masih Belum Muncul?

### Check 1: Verifikasi File Benar
```bash
# Check line 976-977
cat src/app/produk/pesanan/[orderId]/OrderDetailClient.tsx | sed -n '975,977p'
```

**Expected Output:**
```typescript
<p className="font-belleza text-xs text-green-700 mt-1">
  Pesanan akan terselesaikan otomatis pada <span className="font-semibold">{autoCompleteDate}</span>
</p>
```

### Check 2: Restart Komputer
Kadang port atau process masih nyangkut

### Check 3: Check Browser DevTools Console
F12 → Console tab
- Lihat ada error atau tidak
- Cek apakah file JS ter-load yang baru

---

## 🔍 Debug Browser

Di halaman order detail, buka Console (F12) dan run:

```javascript
// Check auto complete date format
console.log(document.querySelector('.text-green-700')?.textContent);
```

**Expected Output:**
```
Pesanan akan terselesaikan otomatis pada 14 November 2025 pukul 14:30
```

---

## 📝 Summary

Perubahan yang sudah dilakukan:
- ✅ Update format: Tambah "pukul HH:MM"
- ✅ Hapus: "(X hari lagi untuk mengajukan pengembalian)"

File yang diubah:
- `src/app/produk/pesanan/[orderId]/OrderDetailClient.tsx` (line 946-954, 975-977)

**Jika masih belum muncul setelah semua step:**
→ Paste screenshot console error atau file OrderDetailClient.tsx line 970-980
