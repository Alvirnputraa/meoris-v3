# 🚀 Setup: Notifikasi Pesanan Terkirim (Delivered)

## 📋 Overview

Sistem ini secara otomatis membuat notifikasi untuk user ketika status pesanan berubah menjadi **"delivered"** dengan informasi waktu auto-complete (2 hari setelah delivered).

---

## 🎯 Format Notifikasi

**Title**: Pesanan Terkirim

**Message**:
```
Pesanan anda dengan id pesanan 1A2B3C4D5E telah terkirim.
Pesanan akan terselesaikan otomatis pada 14 Januari 2025 pukul 15:30
```

**Icon**: Checkmark dalam lingkaran (✓) dengan background hijau

---

## ⚡ Quick Setup (2 Langkah)

### Langkah 1: Buka Supabase SQL Editor

1. Buka **Supabase Dashboard**: https://supabase.com/dashboard
2. Pilih project Anda
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New Query**

---

### Langkah 2: Copy & Run SQL Script

Copy script dibawah ini dan paste ke SQL Editor, lalu klik **Run**:

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

**Expected Result:**
```
Success. No rows returned
```

---

### Langkah 3: Verify Setup

Jalankan query ini untuk memastikan trigger sudah dibuat:

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_delivered';
```

**Expected Result:**
```
trigger_name: trigger_notification_on_order_delivered
event_manipulation: UPDATE
event_object_table: orders
action_statement: EXECUTE FUNCTION create_notification_on_order_delivered()
```

✅ Jika ada hasil, setup berhasil!

---

## 🧪 Testing

### Manual Test

1. **Cari order dengan status "shipped"**
   ```sql
   SELECT id, order_number, status, delivered_at
   FROM orders
   WHERE status = 'shipped'
   LIMIT 1;
   ```

2. **Update status ke "delivered"**
   ```sql
   UPDATE orders
   SET status = 'delivered',
       delivered_at = NOW()
   WHERE id = '<order-id>';
   ```

3. **Cek notifikasi dibuat**
   ```sql
   SELECT *
   FROM notifications
   WHERE order_id = '<order-id>'
   AND type = 'order_delivered'
   ORDER BY created_at DESC;
   ```

4. **Verify di UI**
   - Login sebagai user yang punya order tersebut
   - Buka: `http://localhost:3000/user/purchase?view=notifications`
   - Harusnya muncul notifikasi dengan icon checkmark hijau:
     ```
     ✓ Pesanan Terkirim
     Pesanan anda dengan id pesanan 1A2B3C4D5E telah terkirim.
     Pesanan akan terselesaikan otomatis pada 14 Januari 2025 pukul 15:30
     12 Jan 2025, 14:30 • Lihat Pesanan
     ```

### Test via Script

```bash
node test_delivered_notification.js
```

Script ini akan:
1. Mencari order dengan status "shipped"
2. Update status ke "delivered" dengan timestamp
3. Verify notification dibuat dengan format yang benar
4. Tampilkan hasil test

---

## 🎯 Cara Kerja

```
Biteship Webhook / Manual Update
         ↓
Update order.status = 'delivered'
Update order.delivered_at = NOW()
         ↓
Database Trigger: trigger_notification_on_order_delivered
         ↓
Function: create_notification_on_order_delivered()
         ↓
Calculate: auto_complete = delivered_at + 2 days
         ↓
Format: "14 Januari 2025 pukul 15:30"
         ↓
Insert ke table notifications
         ↓
User lihat di: /user/purchase?view=notifications
```

---

## 📊 Database Details

### Trigger Behavior

**Trigger Name**: `trigger_notification_on_order_delivered`

**Fires When**:
- Table: `orders`
- Event: `AFTER UPDATE OF status`
- Condition: OLD.status = 'shipped' AND NEW.status = 'delivered' AND NEW.delivered_at IS NOT NULL

**Calculation**:
- Auto-complete date = `delivered_at + 2 days`
- Format: "DD Month YYYY pukul HH:MM" (Bahasa Indonesia)
- Example: "14 Januari 2025 pukul 15:30"

**Order ID Format**:
- Take UUID from `order.id`
- Remove all dashes
- Take first 10 characters
- Convert to UPPERCASE
- Example: `1A2B3C4D5E`

---

## 🎨 Notification UI

### Visual Design

```
┌────────────────────────────────────────────────┐
│  ✓   Pesanan Terkirim                         │
│  🟢  Pesanan anda dengan id pesanan           │
│      1A2B3C4D5E telah terkirim. Pesanan akan  │
│      terselesaikan otomatis pada 14 Januari   │
│      2025 pukul 15:30                         │
│      12 Jan 2025, 14:30 • Lihat Pesanan       │
└────────────────────────────────────────────────┘
```

**Visual Elements:**
- 🟢 Green circular background (bg-green-100)
- ✓ Checkmark icon in circle (text-green-600)
- Order ID: 10 karakter uppercase
- Auto-complete date: DD Month YYYY pukul HH:MM
- Link: "Lihat Pesanan" ke order detail

---

## 📝 Integration Points

| Komponen | File/Location | Fungsi |
|----------|---------------|--------|
| Biteship Webhook | `/api/biteship/webhook/route.ts` | Auto-update status ke delivered |
| Trigger | Database | Auto-create notification |
| UI | `src/app/user/purchase/page.tsx` (line 6039-6040, 6055-6059) | Display icon & notification |
| Order Detail | `src/app/produk/pesanan/[orderId]/OrderDetailClient.tsx` (line 944-950) | Show same date format |

---

## 🔄 Format Waktu

### Dalam Notifikasi:
```
14 Januari 2025 pukul 15:30
```

### Dalam Order Detail:
```
Pesanan akan terselesaikan otomatis pada 14 Januari 2025
```

**Note**: Order detail hanya menampilkan tanggal tanpa jam. Notifikasi menampilkan lengkap dengan jam:menit.

---

## 🔍 Troubleshooting

### Notifikasi tidak muncul?

**1. Cek trigger exists:**
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_delivered';
```
Jika kosong → Ulangi setup SQL

**2. Cek `delivered_at` field:**
```sql
SELECT id, status, delivered_at FROM orders
WHERE id = '<order-id>';
```
`delivered_at` harus NOT NULL saat status = 'delivered'

**3. Cek notifikasi di database:**
```sql
SELECT * FROM notifications
WHERE order_id = '<order-id>'
AND type = 'order_delivered';
```

**4. Cek RLS policy:**
```sql
-- User harus bisa SELECT notifications mereka sendiri
SELECT * FROM notifications WHERE user_id = '<user-id>';
```

**5. Cek Supabase logs:**
- Dashboard → Logs → Look for RAISE NOTICE message

---

## ✅ Testing Checklist

- [ ] Setup trigger via SQL Editor
- [ ] Verify trigger exists
- [ ] Test dengan order status "shipped"
- [ ] Update ke "delivered" dengan delivered_at
- [ ] Verify notification dibuat di database
- [ ] Cek format waktu: "DD Month YYYY pukul HH:MM"
- [ ] Cek ID pesanan: 10 karakter uppercase
- [ ] Login sebagai user dan cek `/user/purchase?view=notifications`
- [ ] Verify icon: Checkmark hijau
- [ ] Verify message includes auto-complete date
- [ ] Klik "Lihat Pesanan" dan verify redirect

---

## 🚀 Complete Notification System

Setelah setup ini, sistem memiliki 4 tipe notifikasi:

| Type | Title | Trigger | Icon | Color |
|------|-------|---------|------|-------|
| `order_created` | Pesanan Baru | Order insert (UNPAID) | 🛍️ Shopping bag | Yellow |
| `payment_success` | Pembayaran Berhasil | Status → paid | ✅ Checkmark | Green |
| `order_shipped` | Pesanan Dikirim | Status → shipped | 🚚 Truck | Purple |
| `order_delivered` | Pesanan Terkirim | Status → delivered | ✓ Checkmark circle | Green |

---

## 📚 Related Files

- **SQL Script**: `create_notification_on_delivered.sql`
- **Test Script**: `test_delivered_notification.js`
- **UI Component**: `src/app/user/purchase/page.tsx` (line 6031-6066)
- **Related**: `SHIPPED_NOTIFICATION_IMPLEMENTATION.md`
- **Related**: `NOTIFICATION_FIXES_SUMMARY.md`

---

## 💡 Future Enhancements

1. **Email notification** saat delivered
2. **Push notification** via service worker
3. **SMS notification** via Twilio
4. **Countdown timer** untuk return window
5. **Auto-complete notification** saat order completed

---

**Last Updated**: 2025-01-12
**Version**: 1.0.0
**Status**: ✅ Ready to Deploy
