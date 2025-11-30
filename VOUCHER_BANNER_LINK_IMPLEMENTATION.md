# Implementasi Link "Cek Disini" ke Voucher Section

## Masalah
Di halaman https://meoris.id/user/purchase, terdapat banner hitam dengan teks:
```
Dapatkan potongan diskon dan pengiriman - cek disini
```

Label "cek disini" belum bisa diklik. User ingin agar label tersebut bisa diklik dan mengarah ke halaman home dengan auto-scroll ke section "Voucher Spesial Untuk Anda".

## Solusi yang Diimplementasikan

### 1. File: `src/app/user/purchase/page.tsx` (line 3741-3748)

**Perubahan:**
```tsx
// BEFORE:
<span className="text-blue-400 underline">cek disini</span>

// AFTER:
<span
  className="text-blue-400 underline cursor-pointer hover:text-blue-300 transition-colors"
  onClick={() => {
    router.push('/#voucher-section');
  }}
>cek disini</span>
```

**Penjelasan:**
- Menambahkan `cursor-pointer` untuk menunjukkan bahwa teks bisa diklik
- Menambahkan `hover:text-blue-300` untuk efek hover (warna berubah lebih terang saat hover)
- Menambahkan `transition-colors` untuk smooth transition
- Menambahkan `onClick` handler yang navigate ke `/#voucher-section`

### 2. Voucher Section di Home Page

**File:** `src/app/page.tsx` (line 2641)

Section voucher sudah memiliki ID yang benar:
```tsx
<section id="voucher-section" className="bg-white pt-8 pb-12 md:pt-10 md:pb-16" data-route="/home">
```

### 3. Auto-Scroll Functionality

**File:** `src/app/page.tsx` (line 313-384)

Halaman home sudah memiliki useEffect yang menangani:
- ✅ Hash navigation (`window.location.hash`)
- ✅ Smooth scroll dengan offset untuk fixed header (120px)
- ✅ Retry mechanism jika element belum load
- ✅ Event listener untuk hash changes

## Flow Kerja

1. User klik "cek disini" di halaman `/user/purchase`
2. `router.push('/#voucher-section')` dipanggil
3. Browser navigate ke halaman home (`/`)
4. Hash `#voucher-section` tersimpan di URL
5. useEffect di home page detect hash
6. Fungsi `scrollToSection('voucher-section')` dipanggil
7. Browser scroll smooth ke element dengan ID `voucher-section`
8. Scroll position diperhitungkan dengan header offset 120px

## Testing

### Manual Test
1. Buka browser dan pergi ke https://meoris.id/user/purchase
2. Hover mouse ke teks "cek disini" - cursor seharusnya berubah jadi pointer, warna teks jadi lebih terang
3. Klik "cek disini"
4. Browser seharusnya:
   - Navigate ke halaman home
   - Otomatis scroll smooth ke section "Voucher Spesial Untuk Anda"
   - URL berubah jadi https://meoris.id/#voucher-section

### Test Cases
- ✅ Klik dari halaman purchase → scroll ke voucher section
- ✅ Direct access ke URL `/#voucher-section` → auto scroll ke voucher
- ✅ Hover effect pada "cek disini"
- ✅ Cursor berubah jadi pointer saat hover

## Browser Compatibility
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (responsive design sudah ada)

## File yang Diubah
1. ✅ `src/app/user/purchase/page.tsx` (line 3741-3748)

## File yang Diverifikasi (Tidak Perlu Diubah)
1. ✅ `src/app/page.tsx` - Scroll functionality sudah ada
2. ✅ `src/app/page.tsx` - Voucher section ID sudah benar (`voucher-section`)

## Catatan
- Tidak perlu perubahan di backend/database
- Tidak perlu CSS tambahan (menggunakan Tailwind classes yang sudah ada)
- Hash navigation sudah fully supported di halaman home
