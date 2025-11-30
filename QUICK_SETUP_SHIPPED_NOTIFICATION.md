# 🚀 Quick Setup: Notifikasi Pesanan Dikirim

## Setup dalam 3 Langkah (5 menit)

---

## ⚡ Langkah 1: Buka Supabase SQL Editor

1. Buka **Supabase Dashboard**: https://supabase.com/dashboard
2. Pilih project Anda
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New Query**

---

## ⚡ Langkah 2: Copy & Run SQL Script

Copy script dibawah ini dan paste ke SQL Editor, lalu klik **Run**:

```sql
-- Function to create notification when order status changes to SHIPPED
CREATE OR REPLACE FUNCTION create_notification_on_order_shipped()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status changed from 'processing' or 'paid' to 'shipped'
  IF (OLD.status IN ('processing', 'paid') OR OLD.status IS NULL)
     AND NEW.status = 'shipped' THEN

    INSERT INTO public.notifications (
      user_id,
      order_id,
      type,
      title,
      message
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'order_shipped',
      'Pesanan Dikirim',
      'Pesanan anda dengan id pesanan ' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 10)) || ' telah dikirim ke pihak ekspedisi'
    );

    -- Log untuk debugging
    RAISE NOTICE 'Notification created for order % - Status changed from % to %',
      NEW.order_number, OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_notification_on_order_shipped ON public.orders;

-- Create trigger: Notification when order status changes to 'shipped'
CREATE TRIGGER trigger_notification_on_order_shipped
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_order_shipped();

-- Grant necessary permissions
GRANT SELECT ON public.notifications TO authenticated;
```

**Expected Result:**
```
Success. No rows returned
```

---

## ⚡ Langkah 3: Verify Setup

Jalankan query ini untuk memastikan trigger sudah dibuat:

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_shipped';
```

**Expected Result:**
```
trigger_name: trigger_notification_on_order_shipped
event_manipulation: UPDATE
event_object_table: orders
action_statement: EXECUTE FUNCTION create_notification_on_order_shipped()
```

✅ Jika ada hasil, setup berhasil!

---

## 🧪 Testing

### Manual Test via Admin Panel

1. **Login as Admin**
   - Buka: `http://localhost:3000/admin/orders`

2. **Pilih Order dengan Status "Paid"**
   - Klik tab "Paid (Menunggu Konfirmasi)"
   - Pilih salah satu order

3. **Generate Resi**
   - Klik tombol **"📦 Generate Resi"**
   - Tunggu proses selesai (status akan berubah jadi "shipped")

4. **Cek Notifikasi**
   - Login sebagai user yang punya order tersebut
   - Buka: `http://localhost:3000/user/purchase?view=notifications`
   - Harusnya muncul notifikasi dengan icon truk ungu:
     ```
     🚚 Pesanan Dikirim
     Pesanan anda dengan id pesanan 1A2B3C4D5E telah dikirim ke pihak ekspedisi
     12 Jan 2025, 14:30 • Lihat Pesanan
     ```

### Test via SQL Query

Jika tidak punya order untuk test, bisa manual update status:

```sql
-- 1. Cari order dengan status 'paid' atau 'processing'
SELECT id, order_number, status, user_id
FROM orders
WHERE status IN ('paid', 'processing')
LIMIT 1;

-- 2. Update status ke 'shipped' (ganti <order-id> dengan ID dari query diatas)
UPDATE orders
SET status = 'shipped'
WHERE id = '<order-id>';

-- 3. Cek apakah notifikasi dibuat
SELECT *
FROM notifications
WHERE order_id = '<order-id>'
AND type = 'order_shipped'
ORDER BY created_at DESC;
```

**Expected Result:**
Akan muncul 1 row baru di `notifications` dengan:
- `type`: 'order_shipped'
- `title`: 'Pesanan Dikirim'
- `message`: 'Pesanan anda dengan id pesanan 1A2B3C4D5E telah dikirim ke pihak ekspedisi'
- Icon: Truk pengiriman dengan background purple

---

## 🎯 Cara Kerja

```
┌─────────────────────────────────────────────┐
│  Admin klik "Generate Resi"                 │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  API: /api/admin/generate-resi              │
│  → Update order.status = 'shipped'          │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Database Trigger: Otomatis fire            │
│  trigger_notification_on_order_shipped      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Function: create_notification_on_order_    │
│            shipped()                         │
│  → Insert ke table notifications            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  User buka: /user/purchase?view=            │
│             notifications                    │
│  → Melihat notifikasi baru                  │
└─────────────────────────────────────────────┘
```

---

## ❓ Troubleshooting

### Notifikasi tidak muncul?

**1. Cek trigger exists:**
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_shipped';
```
Jika kosong → Ulangi Langkah 2

**2. Cek function exists:**
```sql
SELECT proname FROM pg_proc
WHERE proname = 'create_notification_on_order_shipped';
```
Jika kosong → Ulangi Langkah 2

**3. Cek apakah status order benar-benar berubah:**
```sql
SELECT id, order_number, status FROM orders
WHERE id = '<order-id>';
```
Status harus "shipped"

**4. Cek table notifications:**
```sql
SELECT * FROM notifications
WHERE order_id = '<order-id>'
ORDER BY created_at DESC;
```

**5. Cek RLS policy:**
```sql
-- Login dulu sebagai user di app
-- Lalu cek via Supabase JS client
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', '<user-id>');
```

---

## 📋 Checklist

Setup complete jika semua ini ✅:

- [ ] SQL script berhasil dijalankan tanpa error
- [ ] Query verify menampilkan trigger exists
- [ ] Test manual via admin panel berhasil
- [ ] Notifikasi muncul di `/user/purchase?view=notifications`
- [ ] Notifikasi punya title "Pesanan Dikirim"
- [ ] Notifikasi punya message dengan order number
- [ ] Link "Lihat Pesanan" berfungsi

---

## 🎉 Selesai!

Setup berhasil! Sekarang setiap kali admin generate resi (yang mengubah status ke "shipped"), user akan otomatis dapat notifikasi.

**Next Steps:**
- Lihat file `SHIPPED_NOTIFICATION_IMPLEMENTATION.md` untuk detail lengkap
- Test dengan multiple orders
- Consider adding email/SMS notification (optional)

---

**Need Help?**
- Cek logs di Supabase Dashboard → Logs
- Review SQL di file: `create_notification_on_shipped.sql`
- Run test script: `node test_shipped_notification.js` (requires .env.local)
