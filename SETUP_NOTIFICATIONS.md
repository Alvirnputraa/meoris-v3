# Setup Sistem Notifikasi

## Langkah 1: Jalankan SQL untuk Membuat Tabel dan Trigger

Jalankan file SQL berikut di Supabase SQL Editor:

```bash
create_notifications_table.sql
```

File ini akan:
1. ✅ Membuat tabel `notifications` dengan kolom:
   - `id` (UUID, primary key)
   - `user_id` (UUID, foreign key ke auth.users)
   - `order_id` (UUID, foreign key ke orders)
   - `type` (VARCHAR: 'order_created', 'payment_success', dll)
   - `title` (VARCHAR: judul notifikasi)
   - `message` (TEXT: isi pesan notifikasi)
   - `is_read` (BOOLEAN: status sudah dibaca atau belum)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

2. ✅ Membuat index untuk performa query yang lebih cepat

3. ✅ Setup Row Level Security (RLS):
   - User hanya bisa melihat notifikasi mereka sendiri
   - User bisa update notifikasi mereka sendiri (untuk mark as read)

4. ✅ Membuat trigger otomatis:
   - **Trigger 1**: Ketika order baru dibuat dengan status UNPAID/pending
     - Otomatis buat notifikasi: "Harap selesaikan pembayaran pesanan anda dalam 1 x 24 jam"

   - **Trigger 2**: Ketika status order berubah dari UNPAID/pending ke paid
     - Otomatis buat notifikasi: "Pembayaran berhasil. Pesananmu sekarang sedang dikemas"

## Langkah 2: Cara Menggunakan

### Di UI Purchase Page:
1. Buka http://localhost:3000/user/purchase?view=purchase
2. Klik tab **"Notifikasi"** di sidebar
3. Notifikasi akan muncul otomatis

### Fitur Notifikasi:
- ✅ **Auto-load**: Notifikasi otomatis dimuat saat tab dibuka
- ✅ **Icon berbeda**: Setiap tipe notifikasi punya icon dan warna berbeda
  - 🟡 Order Created: Icon shopping bag kuning
  - 🟢 Payment Success: Icon checkmark hijau
- ✅ **Unread indicator**: Notifikasi belum dibaca punya:
  - Background orange muda
  - Dot orange di pojok kanan
- ✅ **Link ke order**: Klik "Lihat Pesanan" untuk langsung ke detail order
- ✅ **Timestamp**: Tanggal & waktu notifikasi dibuat
- ✅ **Empty state**: Menampilkan "Belum ada notifikasi" jika kosong

## Langkah 3: Testing

### Test 1: Notifikasi Order Baru
1. Buat order baru dengan status UNPAID
2. Buka tab Notifikasi
3. Harus muncul notifikasi: "Harap selesaikan pembayaran pesanan anda dalam 1 x 24 jam"

### Test 2: Notifikasi Pembayaran Berhasil
1. Update status order dari UNPAID ke paid
2. Refresh tab Notifikasi
3. Harus muncul notifikasi baru: "Pembayaran berhasil. Pesananmu sekarang sedang dikemas"

## Struktur Database

```sql
notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL → auth.users(id),
  order_id UUID → orders(id),
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

## Tipe Notifikasi Saat Ini

| Type | Title | Message | Trigger |
|------|-------|---------|---------|
| `order_created` | Pesanan Baru | Harap selesaikan pembayaran pesanan anda dalam 1 x 24 jam | Order INSERT dengan status UNPAID/pending |
| `payment_success` | Pembayaran Berhasil | Pembayaran berhasil. Pesananmu sekarang sedang dikemas | Order UPDATE status UNPAID→paid |

## Catatan Penting

⚠️ **PASTIKAN**:
1. Tabel `orders` sudah ada kolom `user_id` dan `status`
2. RLS sudah di-enable untuk keamanan
3. User sudah login untuk melihat notifikasi
4. Jalankan SQL di Supabase SQL Editor, BUKAN di terminal

## File Terkait

- `create_notifications_table.sql` - SQL untuk setup database
- `src/app/user/purchase/page.tsx` - UI yang sudah diupdate (line 132-133, 1337-1364, 5999-6106)

## Troubleshooting

**Notifikasi tidak muncul?**
1. Cek apakah SQL sudah dijalankan dengan benar
2. Cek console browser untuk error
3. Pastikan user sudah login
4. Cek di Supabase Table Editor apakah data notifikasi ada

**Trigger tidak jalan?**
1. Cek di Supabase → Database → Triggers, apakah trigger sudah ada
2. Test manual: INSERT order baru di Table Editor, cek apakah notifikasi tercreate
3. Cek error logs di Supabase

## Next Steps (Optional)

Bisa ditambahkan:
- Mark notification as read
- Delete notification
- Real-time notification dengan Supabase Realtime
- Push notification
- Email notification
- Notifikasi untuk status lainnya (shipped, delivered, dll)
