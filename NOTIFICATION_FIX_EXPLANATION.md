# Penjelasan Fix Sistem Notifikasi

## Root Cause: Kenapa Notifikasi Tidak Muncul?

### Analisis Masalah

1. **Order Creation Flow**:
   - User checkout → Tripay payment → Payment callback → **Order dibuat LANGSUNG dengan status `paid`**
   - Order TIDAK dibuat saat user klik "Bayar", tapi SETELAH pembayaran berhasil
   - Lihat `src/server/tripay.ts` line 222-240:
     ```typescript
     .insert({
       user_id: submission.user_id,
       status: 'paid',  // ← Langsung paid, bukan UNPAID
       ...
     })
     ```

2. **Trigger Lama (Salah)**:
   - Trigger `create_notification_on_order_insert()` hanya trigger jika status = `UNPAID` atau `pending`
   - Tapi karena order dibuat langsung dengan status `paid`, trigger TIDAK JALAN
   - Dari `create_notifications_table.sql` line 39:
     ```sql
     IF NEW.status IN ('UNPAID', 'pending') THEN
       -- Trigger tidak akan jalan karena status = 'paid'
     END IF;
     ```

3. **Kesimpulan**:
   - ✅ `user_id` SUDAH tersimpan dengan benar
   - ✅ Trigger sudah terpasang
   - ✅ RLS policy sudah benar
   - ❌ **Trigger condition salah** - mengecek status yang tidak pernah terjadi

## Solusi

### File: `fix_notification_triggers.sql`

**Perubahan:**

1. **Hapus trigger lama** yang check status `UNPAID`/`pending`
2. **Buat trigger baru** yang langsung create notification saat order insert dengan status `paid`
3. **Tambah trigger update** sebagai backup jika ada perubahan status ke `paid` di masa depan

**Trigger Baru:**

```sql
-- Trigger 1: Notifikasi saat order dibuat dengan status paid
CREATE FUNCTION create_notification_on_order_paid_insert()
  IF NEW.status = 'paid' THEN
    INSERT INTO notifications (type='payment_success', message='Pembayaran berhasil...')
  END IF

-- Trigger 2: Notifikasi saat status berubah ke paid (backup)
CREATE FUNCTION create_notification_on_status_update()
  IF OLD.status != 'paid' AND NEW.status = 'paid' THEN
    -- Cek duplikasi, lalu insert notification
  END IF
```

## Cara Fix

### Step 1: Jalankan SQL Fix

Jalankan file ini di Supabase SQL Editor:

```bash
fix_notification_triggers.sql
```

File ini akan:
- ✅ Drop trigger lama yang salah
- ✅ Create trigger baru yang benar
- ✅ Verify trigger terpasang

### Step 2: Test

1. Buat order baru di `/produk/checkout`
2. Bayar menggunakan Tripay sandbox
3. Setelah pembayaran berhasil, buka `/user/purchase?view=notifications`
4. Notifikasi **"Pembayaran Berhasil"** harus muncul

### Step 3: Verify (Optional)

Jalankan query ini untuk cek trigger sudah terpasang:

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_notification_on_order_paid_insert',
  'trigger_notification_on_status_update'
);
```

Expected output:
```
trigger_notification_on_order_paid_insert | INSERT | orders
trigger_notification_on_status_update     | UPDATE | orders
```

## Timeline Notifikasi yang Benar

Setelah fix:

1. User checkout → klik bayar
2. User bayar via Tripay (QRIS, Virtual Account, dll)
3. Tripay callback → order created dengan status `paid`
4. **Trigger auto-create notification**: "Pembayaran Berhasil. Pesananmu sekarang sedang dikemas"
5. User buka tab Notifikasi → notifikasi muncul ✅

## Catatan Penting

### Mengapa Tidak Ada Notifikasi "Harap Selesaikan Pembayaran"?

Karena sistem ini **tidak membuat order sebelum payment**. Order hanya dibuat SETELAH payment berhasil.

Jika di masa depan ingin ada notifikasi "Harap selesaikan pembayaran":
- Harus ubah flow: buat order dengan status `UNPAID` saat user klik bayar
- Lalu update status ke `paid` saat callback Tripay
- Tapi ini butuh perubahan besar di `src/server/tripay.ts` dan `src/app/produk/checkout/page.tsx`

### Trigger yang Sekarang

| Event | Trigger | Notification |
|-------|---------|--------------|
| Order INSERT dengan status `paid` | `trigger_notification_on_order_paid_insert` | "Pembayaran Berhasil. Pesananmu sekarang sedang dikemas" |
| Order UPDATE status → `paid` | `trigger_notification_on_status_update` | "Pembayaran Berhasil. Pesananmu sekarang sedang dikemas" (jika belum ada) |

## Troubleshooting Setelah Fix

**Notifikasi masih tidak muncul?**

1. Cek apakah trigger sudah terpasang:
   ```sql
   SELECT * FROM information_schema.triggers
   WHERE trigger_name LIKE '%notification%';
   ```

2. Cek apakah ada data di tabel notifications:
   ```sql
   SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
   ```

3. Cek console browser untuk error RLS:
   - Buka DevTools → Console
   - Buka tab Notifikasi
   - Lihat apakah ada error "permission denied"

4. Test manual insert:
   ```sql
   -- Ganti USER_ID dan ORDER_ID dengan data real
   INSERT INTO notifications (user_id, order_id, type, title, message)
   VALUES (
     'USER_ID'::uuid,
     'ORDER_ID'::uuid,
     'payment_success',
     'Test',
     'Test notification'
   );
   ```
   Jika manual insert muncul di UI, berarti masalah di trigger. Jika tidak muncul, masalah di RLS atau UI.

## Files yang Diupdate

- ✅ `fix_notification_triggers.sql` - SQL fix untuk trigger
- ✅ `NOTIFICATION_FIX_EXPLANATION.md` - Dokumentasi ini
- ✅ `debug_notification_system.sql` - Comprehensive debug queries
- ✅ `src/app/user/purchase/page.tsx` - UI sudah benar (sudah ada dari sebelumnya)

## Next Steps

Setelah fix ini dijalankan, sistem notifikasi akan bekerja dengan benar untuk flow pembayaran yang ada sekarang.

Untuk menambahkan notifikasi lain di masa depan (misal: "Pesanan Dikirim", "Pesanan Diterima"), cukup tambahkan trigger baru atau call insert notification dari kode backend.
