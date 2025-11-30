# Newsletter Subscription Setup Guide

## Overview
Newsletter popup telah diimplementasikan dengan fitur:
- ✅ Popup muncul otomatis setelah 2 detik
- ✅ Logika cerdas: Tidak muncul lagi selama 7 hari setelah ditutup
- ✅ Form input email dengan validasi
- ✅ Integrasi dengan Supabase database
- ✅ Responsive design yang match dengan newsletter.png

## Setup Database

### 1. Buka Supabase Dashboard
Login ke Supabase dashboard dan buka project Anda.

### 2. Jalankan SQL Script
- Buka **SQL Editor** di Supabase dashboard
- Copy semua isi dari file `create_newsletter_subscriptions_table.sql`
- Paste ke SQL Editor
- Klik **Run** untuk menjalankan script

### 3. Verifikasi Tabel Sudah Dibuat
Setelah menjalankan SQL script, cek di **Table Editor** bahwa tabel `newsletter_subscriptions` sudah terbuat dengan kolom:
- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique)
- `is_active` (BOOLEAN)
- `subscribed_at` (TIMESTAMPTZ)
- `unsubscribed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Cara Kerja

### Newsletter Popup Logic
1. **Pertama kali user visit**: Popup muncul setelah 2 detik
2. **User close popup**: Timestamp disimpan di localStorage
3. **User visit lagi**: Popup tidak muncul jika belum 7 hari
4. **Setelah 7 hari**: Popup muncul lagi

### Email Subscription Flow
1. User mengisi email di form
2. Email divalidasi (format check)
3. Cek apakah email sudah terdaftar
4. Jika sudah terdaftar: Tampilkan error
5. Jika belum: Simpan ke database
6. Tampilkan success message
7. Auto close popup setelah 3 detik

## API Endpoint

### POST `/api/newsletter/subscribe`
Subscribe email ke newsletter

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Email berhasil didaftarkan untuk newsletter",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "is_active": true,
    "subscribed_at": "2025-01-15T10:30:00Z"
  }
}
```

**Response Error (409 - Email sudah terdaftar):**
```json
{
  "error": "Email ini sudah terdaftar untuk newsletter"
}
```

**Response Error (400 - Format email salah):**
```json
{
  "error": "Format email tidak valid"
}
```

## Testing

### 1. Test Popup Muncul
- Buka halaman home (/)
- Tunggu 2 detik
- Popup newsletter harus muncul

### 2. Test Close Popup
- Klik tombol X atau klik backdrop
- Popup harus tertutup
- Refresh halaman
- Popup TIDAK muncul lagi (tersimpan di localStorage)

### 3. Test Clear localStorage (untuk testing ulang)
Buka console browser dan jalankan:
```javascript
localStorage.removeItem('meoris_newsletter_closed_at')
```
Refresh halaman, popup akan muncul lagi.

### 4. Test Email Subscription
- Masukkan email valid
- Klik tombol "Berlangganan"
- Harus muncul success message
- Cek di Supabase Table Editor, email harus tersimpan

### 5. Test Email Duplicate
- Masukkan email yang sama lagi
- Harus muncul error "Email ini sudah terdaftar untuk newsletter"

### 6. Test Email Invalid
- Masukkan email tanpa @
- Harus muncul error "Format email tidak valid"

## Customization

### Ubah Interval Popup
Edit file `src/app/page.tsx` line 175:
```typescript
const DAYS_TO_SHOW_AGAIN = 7; // Ubah angka ini (dalam hari)
```

### Ubah Delay Popup
Edit file `src/app/page.tsx` line 185 & 195:
```typescript
setTimeout(() => setShowNewsletterPopup(true), 2000); // 2000 = 2 detik
```

### Ubah Auto Close Duration
Edit file `src/app/page.tsx` line 288:
```typescript
setTimeout(() => {
  handleCloseNewsletter();
}, 3000); // 3000 = 3 detik
```

## Security

### RLS (Row Level Security)
Tabel sudah dilengkapi dengan RLS policies:
- ✅ Public dapat insert (untuk subscribe)
- ✅ Public dapat select (untuk cek duplicate)
- ✅ Public dapat update (untuk reactivate subscription)

### Email Validation
- Client-side: Regex validation
- Server-side: Format check & duplicate check
- Email disimpan dalam lowercase untuk consistency

## Troubleshooting

### Popup tidak muncul
1. Cek localStorage apakah ada `meoris_newsletter_closed_at`
2. Clear localStorage dan refresh
3. Cek console untuk error

### Error saat submit email
1. Cek apakah tabel `newsletter_subscriptions` sudah dibuat
2. Cek RLS policies sudah di-enable
3. Cek console network tab untuk error detail

### Gambar newsletter tidak muncul
1. Pastikan file `public/newsletter/newsletter.png` ada
2. Cek console untuk error loading image
