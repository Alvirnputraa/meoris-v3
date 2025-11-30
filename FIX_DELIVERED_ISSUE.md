# 🔧 Fix: Pesanan Delivered Tidak Muncul Warning & Notifikasi

## 🐛 Masalah

Ketika order sudah status "delivered":
- ❌ Warning "Pesanan akan terselesaikan otomatis" tidak muncul
- ❌ Button "Ajukan Pengembalian" tidak muncul
- ❌ Notifikasi "Pesanan Terkirim" tidak ada

---

## 🔍 Kemungkinan Penyebab

1. **Trigger notifikasi belum dibuat** ← Paling sering!
2. **delivered_at tidak di-set** (NULL)
3. **Status bukan "delivered"** (case sensitive - mungkin "Delivered")
4. **Order sudah delivered sebelum trigger dibuat**

---

## ⚡ Solusi Cepat (5 Menit)

### Step 1: Check & Setup Trigger Delivered Notification

1. **Buka Supabase Dashboard → SQL Editor**

2. **Run Query Ini untuk Check Trigger:**
   ```sql
   SELECT trigger_name
   FROM information_schema.triggers
   WHERE trigger_name = 'trigger_notification_on_order_delivered';
   ```

   **Hasil:**
   - ✅ **Ada 1 row** → Trigger sudah dibuat, lanjut ke Step 2
   - ❌ **Kosong (0 rows)** → Trigger belum dibuat, **HARUS buat dulu!**

3. **Jika Trigger Belum Ada, Buat Sekarang:**

   Copy paste **SELURUH ISI** file `create_notification_on_delivered.sql` ke SQL Editor, lalu klik **Run**

   ```sql
   -- Function to create notification when order status changes to DELIVERED
   CREATE OR REPLACE FUNCTION create_notification_on_order_delivered()
   RETURNS TRIGGER AS $$
   DECLARE
     auto_complete_date TIMESTAMPTZ;
     formatted_date TEXT;
     order_id_display TEXT;
   BEGIN
     -- Only create notification if status changed from 'shipped' to 'delivered'
     IF (OLD.status = 'shipped' OR OLD.status IS NULL)
        AND NEW.status = 'delivered'
        AND NEW.delivered_at IS NOT NULL THEN

       -- Calculate auto-complete date (delivered_at + 2 days)
       auto_complete_date := NEW.delivered_at + INTERVAL '2 days';

       -- Format: "12 Januari 2025 pukul 14:30"
       formatted_date :=
         TO_CHAR(auto_complete_date, 'DD', 'id_ID') || ' ' ||
         CASE TO_CHAR(auto_complete_date, 'MM')
           WHEN '01' THEN 'Januari'
           WHEN '02' THEN 'Februari'
           WHEN '03' THEN 'Maret'
           WHEN '04' THEN 'April'
           WHEN '05' THEN 'Mei'
           WHEN '06' THEN 'Juni'
           WHEN '07' THEN 'Juli'
           WHEN '08' THEN 'Agustus'
           WHEN '09' THEN 'September'
           WHEN '10' THEN 'Oktober'
           WHEN '11' THEN 'November'
           WHEN '12' THEN 'Desember'
         END || ' ' ||
         TO_CHAR(auto_complete_date, 'YYYY') || ' pukul ' ||
         TO_CHAR(auto_complete_date, 'HH24:MI');

       -- Format order ID: 10 characters uppercase without dashes
       order_id_display := UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 10));

       INSERT INTO public.notifications (
         user_id,
         order_id,
         type,
         title,
         message
       ) VALUES (
         NEW.user_id,
         NEW.id,
         'order_delivered',
         'Pesanan Terkirim',
         'Pesanan anda dengan id pesanan ' || order_id_display || ' telah terkirim. Pesanan akan terselesaikan otomatis pada ' || formatted_date
       );

       -- Log untuk debugging
       RAISE NOTICE 'Delivered notification created for order % - Auto-complete: %',
         order_id_display, formatted_date;
     END IF;

     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Drop trigger if exists
   DROP TRIGGER IF EXISTS trigger_notification_on_order_delivered ON public.orders;

   -- Create trigger: Notification when order status changes to 'delivered'
   CREATE TRIGGER trigger_notification_on_order_delivered
     AFTER UPDATE OF status ON public.orders
     FOR EACH ROW
     EXECUTE FUNCTION create_notification_on_order_delivered();

   -- Grant necessary permissions
   GRANT SELECT ON public.notifications TO authenticated;
   ```

   ✅ **Expected:** "Success. No rows returned"

---

### Step 2: Check Order DEV-T44456308029S2QDD

Run query ini di SQL Editor:

```sql
SELECT
  id,
  order_number,
  status,
  delivered_at,
  user_id
FROM orders
WHERE order_number = 'DEV-T44456308029S2QDD';
```

**Check hasil:**

| Field | Expected | Action if Wrong |
|-------|----------|----------------|
| `status` | 'delivered' (lowercase!) | Lanjut ke Step 3 |
| `delivered_at` | NOT NULL (ada timestamp) | Lanjut ke Step 3 |

---

### Step 3: Fix Order & Trigger Notification

**Copy order ID dari Step 2**, lalu run query ini (ganti `<order-id>`):

```sql
-- Re-trigger notification untuk order yang sudah delivered
UPDATE orders
SET status = 'delivered',
    delivered_at = COALESCE(delivered_at, NOW())
WHERE id = '<order-id>';
```

**Contoh:**
```sql
UPDATE orders
SET status = 'delivered',
    delivered_at = COALESCE(delivered_at, NOW())
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
```

✅ **Expected:** "Success. 1 row updated"

---

### Step 4: Verify Notification Dibuat

```sql
SELECT
  type,
  title,
  message,
  created_at
FROM notifications
WHERE order_id = '<order-id>'
ORDER BY created_at DESC;
```

**Expected Result:**
Harus ada row dengan:
- `type`: 'order_delivered'
- `title`: 'Pesanan Terkirim'
- `message`: 'Pesanan anda dengan id pesanan 1A2B3C4D5E telah terkirim. Pesanan akan terselesaikan otomatis pada...'

✅ Jika ada → **BERHASIL!**
❌ Jika tidak ada → Cek Step 1 lagi, pastikan trigger sudah dibuat

---

### Step 5: Verify di UI

1. **Clear browser cache** (Ctrl + Shift + Delete)

2. **Login sebagai user** yang punya order tersebut

3. **Check Notifikasi:**
   - Buka: `http://localhost:3000/user/purchase?view=notifications`
   - Harus ada notifikasi "Pesanan Terkirim" dengan icon checkmark hijau ✓

4. **Check Order Detail:**
   - Buka: `http://localhost:3000/user/purchase?view=order-detail&order=<order-id>`
   - Harus muncul warning hijau: "Pesanan Anda telah terkirim"
   - Harus muncul: "Pesanan akan terselesaikan otomatis pada [DATE]"
   - Harus ada button: "Ajukan Pengembalian"

---

## 🔧 Alternative: Debug Script

Jika punya .env.local credentials, bisa pakai script:

```bash
# Check issue
node debug_delivered_issue.js DEV-T44456308029S2QDD

# Auto-fix
node debug_delivered_issue.js DEV-T44456308029S2QDD fix
```

---

## 📋 Troubleshooting

### Issue: Warning tetap tidak muncul setelah fix

**Possible Causes:**
1. Browser cache
2. Order detail page bug

**Debug:**
```javascript
// Di browser console halaman order detail
console.log('Order Meta:', orderMeta);
console.log('Status:', orderMeta?.status);
console.log('Delivered At:', orderMeta?.delivered_at);
console.log('Is Delivered:', orderMeta?.status === 'delivered');
```

**Expected:**
```
Status: "delivered"
Delivered At: "2025-01-12T10:30:00.000Z"
Is Delivered: true
```

---

### Issue: Button "Ajukan Pengembalian" tidak muncul

**Kondisi button muncul:**
- Status = 'delivered'
- delivered_at NOT NULL
- Belum lewat 2 hari dari delivered_at

**Check:**
```sql
SELECT
  id,
  status,
  delivered_at,
  delivered_at + INTERVAL '2 days' as return_deadline,
  NOW() as current_time,
  (NOW() < delivered_at + INTERVAL '2 days') as can_return
FROM orders
WHERE order_number = 'DEV-T44456308029S2QDD';
```

Jika `can_return` = `false` → Sudah lewat 2 hari, button tidak akan muncul

---

### Issue: Notifikasi tidak muncul untuk order lain

**Kemungkinan:**
Order lain sudah delivered sebelum trigger dibuat

**Fix:**
```sql
-- Re-trigger semua order yang delivered tapi belum ada notifikasi
UPDATE orders
SET status = 'delivered',
    delivered_at = COALESCE(delivered_at, NOW())
WHERE status = 'delivered'
AND id NOT IN (
  SELECT order_id FROM notifications WHERE type = 'order_delivered'
);
```

---

## ✅ Success Checklist

- [ ] Trigger `trigger_notification_on_order_delivered` exists
- [ ] Order status = 'delivered' (lowercase)
- [ ] Order delivered_at IS NOT NULL
- [ ] Notification dengan type 'order_delivered' exists
- [ ] Warning muncul di order detail page
- [ ] Button "Ajukan Pengembalian" muncul
- [ ] Notifikasi muncul di `/user/purchase?view=notifications`
- [ ] Icon notifikasi = checkmark hijau ✓
- [ ] Message include tanggal auto-complete

---

## 🚀 Setup Shipped Notification (Bonus)

Jika shipped notification juga belum ada, setup sekaligus:

```sql
-- Check trigger shipped
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_shipped';
```

Jika kosong, run `create_notification_on_shipped.sql`

---

## 📞 Masih Ada Masalah?

1. **Check Supabase logs:** Dashboard → Logs
2. **Check browser console:** F12 → Console tab
3. **Run debug script:** `node debug_delivered_issue.js <order-number>`
4. **Check file:** `debug_delivered_order.sql` untuk query manual

---

**Last Updated**: 2025-01-12
**Status**: Ready to Use
