# Troubleshooting: Notifikasi Tidak Muncul

## Langkah Debugging

### Step 1: Jalankan Debug SQL

Jalankan file `check_notifications_debug.sql` di Supabase SQL Editor untuk cek:
- ✅ Apakah tabel notifications ada?
- ✅ Apakah ada data di tabel notifications?
- ✅ Apakah trigger sudah terpasang?
- ✅ Apakah RLS policy sudah benar?
- ✅ Apakah orders punya user_id?

### Step 2: Cek Browser Console

1. Buka http://localhost:3000/user/purchase?view=notifications
2. Buka Chrome DevTools (F12) → Console
3. Lihat apakah ada log:
   ```
   Loading notifications for user: [user-id]
   Notifications loaded: X items
   ```
4. Jika ada error, screenshot dan kirim ke saya

### Step 3: Cek Manual di Supabase Table Editor

1. Buka Supabase → Table Editor → notifications
2. Apakah ada data notifikasi?
3. **Jika TIDAK ADA**, berarti trigger tidak jalan

### Step 4: Cek Trigger (Jika Tidak Ada Data)

Jalankan query ini untuk cek apakah trigger terpasang:

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%notification%';
```

**Expected result**: Harus muncul 2 trigger:
- `trigger_notification_on_order_insert`
- `trigger_notification_on_payment_success`

**Jika TIDAK ADA trigger**, jalankan ulang bagian ini dari `create_notifications_table.sql`:

```sql
-- Function to create notification for new order (UNPAID)
CREATE OR REPLACE FUNCTION create_notification_on_order_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('UNPAID', 'pending') THEN
    INSERT INTO public.notifications (
      user_id,
      order_id,
      type,
      title,
      message
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'order_created',
      'Pesanan Baru',
      'Harap selesaikan pembayaran pesanan anda dalam 1 x 24 jam'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notification_on_order_insert ON public.orders;
CREATE TRIGGER trigger_notification_on_order_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_order_insert();
```

### Step 5: Test Manual Insert Notifikasi

Cari user_id dan order_id yang baru saja dibuat:

```sql
-- Cek user yang sedang login
SELECT id, email FROM auth.users LIMIT 5;

-- Cek order terbaru
SELECT id, user_id, status, created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 5;
```

Lalu insert notifikasi manual:

```sql
INSERT INTO public.notifications (
  user_id,
  order_id,
  type,
  title,
  message
) VALUES (
  'PASTE_USER_ID_DI_SINI'::uuid,
  'PASTE_ORDER_ID_DI_SINI'::uuid,
  'order_created',
  'Test Notifikasi Manual',
  'Ini adalah test notifikasi yang dibuat manual'
);
```

Setelah insert, refresh halaman notifikasi. **Jika muncul**, berarti masalah ada di trigger, bukan di UI.

### Step 6: Cek RLS Policy

Pastikan user bisa SELECT dari tabel notifications:

```sql
-- Test sebagai user yang sedang login
SELECT * FROM public.notifications
WHERE user_id = 'PASTE_USER_ID_DI_SINI'::uuid;
```

**Jika error "permission denied"**, berarti RLS policy bermasalah. Jalankan ulang:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- Recreate policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);
```

### Step 7: Cek Apakah Orders Punya user_id

```sql
SELECT
  id,
  user_id,
  status,
  created_at
FROM public.orders
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;
```

**Jika user_id = NULL**, berarti problem ada di checkout flow yang tidak menyimpan user_id.

### Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| Console log: "Error loading notifications: permission denied" | RLS policy salah, jalankan ulang RLS policy |
| Console log: "Notifications loaded: 0 items" | Trigger tidak jalan ATAU data di tabel kosong |
| Trigger tidak ada di information_schema.triggers | Jalankan ulang CREATE TRIGGER |
| Order tidak punya user_id | Fix checkout flow untuk simpan user_id |
| Manual insert berhasil muncul, tapi auto tidak | Trigger function bermasalah, cek error logs |

### Langkah Terakhir: Manual Trigger Test

Buat order baru secara manual untuk test trigger:

```sql
-- Insert order baru (ganti USER_ID dengan user yang sedang login)
INSERT INTO public.orders (
  user_id,
  status,
  total_amount,
  created_at
) VALUES (
  'PASTE_USER_ID_DI_SINI'::uuid,
  'UNPAID',
  100000,
  NOW()
)
RETURNING id, user_id, status;
```

Setelah insert, langsung cek tabel notifications:

```sql
SELECT * FROM public.notifications
ORDER BY created_at DESC
LIMIT 5;
```

**Jika ada notifikasi baru muncul**, berarti trigger JALAN dengan benar! Problem ada di checkout flow.

**Jika TIDAK muncul**, berarti trigger TIDAK JALAN. Cek error logs Supabase.

---

## Quick Fix: Fresh Install

Jika semua gagal, hapus dan buat ulang:

```sql
-- 1. Drop everything
DROP TRIGGER IF EXISTS trigger_notification_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_notification_on_payment_success ON public.orders;
DROP FUNCTION IF EXISTS create_notification_on_order_insert();
DROP FUNCTION IF EXISTS create_notification_on_payment_success();
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 2. Jalankan ulang create_notifications_table.sql dari awal
```

---

**Setelah testing, kabari saya apa yang muncul di:**
1. Browser console
2. Hasil query `SELECT * FROM notifications`
3. Hasil query check triggers
4. Apakah manual insert berhasil muncul di UI?
