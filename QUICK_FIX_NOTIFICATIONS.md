# Quick Fix: Notifikasi Tidak Muncul

## Problem
Notifikasi tidak muncul setelah user membuat order dan pembayaran berhasil.

## Root Cause
1. Order dibuat **langsung dengan status `paid`** setelah payment callback, tapi trigger lama hanya monitor status `UNPAID`/`pending`.
2. Foreign key constraint error: `user_id` di order mungkin NULL atau tidak exist di `auth.users`.

## Solution (1 Menit)

### Step 0: Debug User ID Issue (Jika Ada Error Foreign Key)

**Jika Anda mendapat error:** `"insert or update on table notifications violates foreign key constraint notifications_user_id_fkey"`

Jalankan dulu file `debug_user_id_issue.sql` untuk cek:
- Apakah orders punya `user_id` yang valid?
- Apakah `user_id` exist di `auth.users`?

```sql
-- Quick check: Lihat order terakhir dan validitas user_id
SELECT
  o.id,
  o.user_id,
  o.status,
  EXISTS (SELECT 1 FROM auth.users WHERE id = o.user_id) as user_valid
FROM public.orders o
ORDER BY o.created_at DESC
LIMIT 5;
```

**Jika `user_valid = false`**, berarti ada masalah di checkout flow. User yang checkout mungkin sudah dihapus atau `user_id` tidak tersimpan dengan benar.

### Step 1: Jalankan SQL Fix

Buka Supabase → SQL Editor → New Query → Copy paste & run:

```sql
-- ===== QUICK FIX: NOTIFICATION TRIGGERS =====

-- Drop old triggers
DROP TRIGGER IF EXISTS trigger_notification_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_notification_on_payment_success ON public.orders;
DROP FUNCTION IF EXISTS create_notification_on_order_insert();
DROP FUNCTION IF EXISTS create_notification_on_payment_success();

-- Create new function for paid order (with user_id validation)
CREATE OR REPLACE FUNCTION create_notification_on_order_paid_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if user_id is valid
  IF NEW.status = 'paid' AND NEW.user_id IS NOT NULL THEN
    -- Verify user exists in auth.users before inserting
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
      INSERT INTO public.notifications (
        user_id,
        order_id,
        type,
        title,
        message
      ) VALUES (
        NEW.user_id,
        NEW.id,
        'payment_success',
        'Pembayaran Berhasil',
        'Pembayaran berhasil. Pesananmu sekarang sedang dikemas'
      );
    ELSE
      RAISE WARNING 'Cannot create notification: user_id % does not exist in auth.users', NEW.user_id;
    END IF;
  ELSIF NEW.status = 'paid' AND NEW.user_id IS NULL THEN
    RAISE WARNING 'Cannot create notification: user_id is NULL for order %', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_notification_on_order_paid_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_order_paid_insert();

-- Backup trigger for status update (with user_id validation)
CREATE OR REPLACE FUNCTION create_notification_on_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'paid' AND NEW.status = 'paid' AND NEW.user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE order_id = NEW.id AND type = 'payment_success'
    ) THEN
      IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
        INSERT INTO public.notifications (
          user_id,
          order_id,
          type,
          title,
          message
        ) VALUES (
          NEW.user_id,
          NEW.id,
          'payment_success',
          'Pembayaran Berhasil',
          'Pembayaran berhasil. Pesananmu sekarang sedang dikemas'
        );
      ELSE
        RAISE WARNING 'Cannot create notification on update: user_id % does not exist in auth.users', NEW.user_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notification_on_status_update
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_status_update();
```

### Step 2: Verify

Check trigger installed:

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

Should show 2 triggers.

### Step 3: Test

1. Buat order baru di http://localhost:3000/produk/checkout
2. Bayar via Tripay
3. Setelah payment success, buka http://localhost:3000/user/purchase?view=notifications
4. Notifikasi **harus muncul** ✅

## Test Existing Order (Optional)

Jika ada order lama yang ingin ditambahkan notifikasinya secara manual:

```sql
-- 1. Cari order yang belum punya notifikasi
SELECT
  o.id as order_id,
  o.user_id,
  o.status,
  o.created_at,
  n.id as notification_exists
FROM orders o
LEFT JOIN notifications n ON n.order_id = o.id
WHERE o.status = 'paid'
  AND n.id IS NULL
ORDER BY o.created_at DESC
LIMIT 5;

-- 2. Insert notifikasi manual untuk order tersebut (ganti ORDER_ID dan USER_ID)
INSERT INTO notifications (user_id, order_id, type, title, message)
VALUES (
  'PASTE_USER_ID'::uuid,
  'PASTE_ORDER_ID'::uuid,
  'payment_success',
  'Pembayaran Berhasil',
  'Pembayaran berhasil. Pesananmu sekarang sedang dikemas'
);
```

## Troubleshooting

### Error: "foreign key constraint notifications_user_id_fkey"

Artinya `user_id` di order tidak valid. Jalankan diagnostic:

```sql
-- Cek order yang bermasalah
SELECT
  o.id,
  o.user_id,
  o.status,
  EXISTS (SELECT 1 FROM auth.users WHERE id = o.user_id) as user_exists,
  o.created_at
FROM public.orders o
ORDER BY o.created_at DESC
LIMIT 5;
```

**Jika `user_exists = false`:**
- User sudah dihapus dari `auth.users`, tapi order masih ada
- Atau `user_id` adalah NULL
- **Solusi:** Trigger yang sudah diupdate akan skip order dengan `user_id` invalid dan log warning. Notifikasi hanya dibuat untuk order dengan `user_id` yang valid.

**Untuk fix order lama dengan user_id invalid:**
```sql
-- Lihat detail lengkap
SELECT * FROM debug_user_id_issue.sql;
```

### Notifikasi tidak muncul di UI

1. Cek browser console untuk error
2. Cek apakah trigger terpasang:
   ```sql
   SELECT trigger_name FROM information_schema.triggers
   WHERE trigger_name LIKE '%notification%';
   ```
3. Cek apakah ada data di notifications table:
   ```sql
   SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
   ```

## Done! 🎉

Notifikasi sekarang akan otomatis muncul setiap kali ada order baru yang dibayar (dengan `user_id` valid).

---

**Need Help?**
- Lihat `NOTIFICATION_FIX_EXPLANATION.md` untuk penjelasan lengkap
- Jalankan `debug_notification_system.sql` untuk comprehensive debugging
- Jalankan `debug_user_id_issue.sql` untuk cek masalah foreign key
- Lihat `TROUBLESHOOT_NOTIFICATIONS.md` untuk troubleshooting step-by-step
