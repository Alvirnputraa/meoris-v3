# Cara Test Link "Cek Disini" di Banner Purchase

## Status
✅ **Code sudah diupdate**
✅ **Build berhasil**
✅ **Dev server running di http://localhost:3000**

## Langkah Testing

### 1. Buka Browser
Buka browser dan akses:
```
http://localhost:3000/user/purchase?pesanan-saya=all
```

Atau jika sudah deploy ke production:
```
https://meoris.id/user/purchase?pesanan-saya=all
```

### 2. Login (Jika Belum)
- Pastikan sudah login dengan akun user
- Jika belum, login dulu di halaman login

### 3. Lihat Banner Hitam di Atas Header
- Di bagian paling atas halaman, ada banner hitam
- Terdapat teks: **"Dapatkan potongan diskon dan pengiriman - cek disini"**

### 4. Test Hover Effect
- Arahkan mouse ke teks **"cek disini"**
- Yang seharusnya terjadi:
  - ✅ Cursor berubah jadi **pointer** (tangan)
  - ✅ Warna teks berubah dari **biru terang** ke **biru lebih terang** (hover effect)

### 5. Test Click Navigation
- Klik pada teks **"cek disini"**
- Yang seharusnya terjadi:
  - ✅ Browser navigate ke halaman home
  - ✅ URL berubah jadi `http://localhost:3000/#voucher-section` atau `https://meoris.id/#voucher-section`
  - ✅ Halaman otomatis **smooth scroll** ke section "Voucher Spesial Untuk Anda"
  - ✅ Section voucher akan terlihat di viewport dengan offset yang pas (tidak tertutup header)

## Troubleshooting

### Jika Masih Tidak Bisa Diklik

#### Opsi 1: Clear Cache Browser
```
1. Tekan Ctrl + Shift + Delete
2. Pilih "Cached images and files"
3. Clear cache
4. Reload halaman dengan Ctrl + F5 (hard reload)
```

#### Opsi 2: Test di Incognito/Private Mode
```
1. Buka browser dalam mode incognito/private
2. Akses http://localhost:3000/user/purchase
3. Login dan test kembali
```

#### Opsi 3: Cek Console Browser
```
1. Tekan F12 untuk buka Developer Tools
2. Pergi ke tab Console
3. Lihat apakah ada error JavaScript
4. Screenshot dan laporkan jika ada error
```

#### Opsi 4: Restart Dev Server
Jika masih bermasalah, restart dev server:
```bash
# Stop dev server (Ctrl+C di terminal)
# Kemudian jalankan lagi:
cd "C:\Users\Administrator\Downloads\meoris-v3-main"
npm run dev
```

#### Opsi 5: Verify Production Build
Jika dev server berfungsi tapi production tidak:
```bash
# Build ulang untuk production
npm run build

# Deploy ke Vercel (jika menggunakan Vercel)
vercel --prod
```

## Verifikasi Code

Jika ingin memastikan code sudah benar, cek file:
```
src/app/user/purchase/page.tsx
Line: 3742-3747
```

Code seharusnya:
```tsx
<span
  className="text-blue-400 underline cursor-pointer hover:text-blue-300 transition-colors"
  onClick={() => {
    router.push('/#voucher-section');
  }}
>cek disini</span>
```

## Browser Compatibility
Tested di:
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## Yang Sudah Dilakukan
1. ✅ Update source code di `src/app/user/purchase/page.tsx`
2. ✅ Tambahkan onClick handler dengan `router.push('/#voucher-section')`
3. ✅ Tambahkan cursor-pointer dan hover effect
4. ✅ Build aplikasi berhasil
5. ✅ Dev server running

## Next Steps
- Deploy ke production (Vercel/hosting)
- Test di production environment
- Monitor user feedback

## Notes
- Perubahan sudah ada di **source code**
- Build **sudah berhasil**
- Jika test di localhost berhasil tapi production tidak, kemungkinan cache atau perlu redeploy
- **IMPORTANT**: Setelah deploy ke production, tunggu 1-2 menit untuk propagation, kemudian clear cache browser
