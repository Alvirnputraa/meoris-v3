# 🚀 STEP-BY-STEP: Apply SQL Fix ke Supabase

## ⚠️ MASALAH SAAT INI

Cron job berjalan tapi **tidak cancel order expired** karena database function salah.

Log menunjukkan: `"ordersCancelled": 0` terus-menerus.

## ✅ SOLUSI (5 MENIT)

### Step 1: Buka Supabase SQL Editor

Klik link ini (akan langsung ke SQL Editor project Anda):

👉 **https://supabase.com/dashboard/project/vtwooclhjobgdgvljauq/sql/new**

### Step 2: Copy SQL Fix

Buka file `APPLY_THIS_SQL_FIX.sql` yang sudah saya buat, atau copy dari bawah ini:

```sql
CREATE OR REPLACE FUNCTION auto_cancel_pending_orders()
RETURNS TABLE(cancelled_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_count INTEGER := 0;
  v_checkout_record RECORD;
  v_order_record RECORD;
BEGIN
  RAISE NOTICE '[AUTO-CANCEL] Starting auto-cancel job at %', NOW();

  -- Cancel expired checkout_submissions
  FOR v_checkout_record IN
    SELECT
      id,
      user_id,
      payment_reference,
      created_at,
      payment_expired_at,
      status
    FROM checkout_submissions
    WHERE
      status = 'submitted'
      AND payment_expired_at IS NOT NULL
      AND payment_expired_at < NOW()
    ORDER BY payment_expired_at ASC
  LOOP
    BEGIN
      UPDATE checkout_submissions
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_checkout_record.id;

      RAISE NOTICE '[AUTO-CANCEL] Cancelled checkout ID: %, Ref: %, User: %, Expired at: %',
        v_checkout_record.id,
        v_checkout_record.payment_reference,
        v_checkout_record.user_id,
        v_checkout_record.payment_expired_at;

      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        created_at
      ) VALUES (
        v_checkout_record.user_id,
        'Pesanan dibatalkan',
        'Pesanan dengan nomor ' || COALESCE(v_checkout_record.payment_reference, v_checkout_record.id::text) || ' telah dibatalkan karena melewati batas waktu pembayaran.',
        'order_cancelled',
        NOW()
      );

      v_cancelled_count := v_cancelled_count + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[AUTO-CANCEL] Error cancelling checkout %: %', v_checkout_record.id, SQLERRM;
    END;
  END LOOP;

  -- Backward compatibility: Cancel old orders in orders table
  FOR v_order_record IN
    SELECT
      id,
      user_id,
      created_at,
      status
    FROM orders
    WHERE
      status IN ('pending', 'belum bayar')
      AND created_at < NOW() - INTERVAL '24 hours'
      AND created_at IS NOT NULL
    ORDER BY created_at ASC
  LOOP
    BEGIN
      UPDATE orders
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_order_record.id;

      RAISE NOTICE '[AUTO-CANCEL] Cancelled order ID: %, User: %, Created: %, Old Status: %',
        v_order_record.id,
        v_order_record.user_id,
        v_order_record.created_at,
        v_order_record.status;

      INSERT INTO notifications (
        user_id,
        order_id,
        title,
        message,
        type,
        created_at
      ) VALUES (
        v_order_record.user_id,
        v_order_record.id,
        'Pesanan dibatalkan',
        'Pesanan anda telah dibatalkan karena melewati batas waktu pembayaran.',
        'order_cancelled',
        NOW()
      );

      v_cancelled_count := v_cancelled_count + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[AUTO-CANCEL] Error cancelling order %: %', v_order_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[AUTO-CANCEL] Completed. Total cancelled: %', v_cancelled_count;

  RETURN QUERY SELECT v_cancelled_count;
END;
$$;
```

### Step 3: Paste & Run

1. Paste SQL di atas ke SQL Editor
2. Klik tombol **"Run"** (atau tekan `Ctrl + Enter` / `Cmd + Enter`)
3. Tunggu sampai muncul "Success" (biasanya beberapa detik)

### Step 4: Test Manual (Optional)

Setelah apply, Anda bisa test langsung dengan SQL ini:

```sql
SELECT * FROM auto_cancel_pending_orders();
```

Hasilnya seharusnya:
- `cancelled_count: 1` (karena ada order DEV-T444563095289GYBH yang sudah expired)

### Step 5: Verifikasi

Di Ubuntu server, jalankan:

```bash
# Test cron endpoint manual
curl -s -H "Authorization: Bearer K3mP9xR7vN2sL5qW8tY4zH6jD1cF0aB3==" \
  http://localhost:3005/api/cron/auto-cancel-pending-orders | jq

# Atau tunggu cron run berikutnya (max 10 menit) dan cek log
tail -f /var/log/meoris-cron.log
```

**Expected result:**
```json
{
  "success": true,
  "message": "Auto-cancel pending orders job executed successfully",
  "ordersCancelled": 1,  // ← Sekarang harusnya > 0!
  "timestamp": "2025-11-18T..."
}
```

## 🎯 KENAPA HARUS MANUAL?

Supabase JavaScript client **tidak bisa** execute DDL commands (CREATE, ALTER, DROP) karena security reasons.

DDL hanya bisa via:
1. ✅ Supabase SQL Editor (paling mudah)
2. ✅ Direct PostgreSQL connection (butuh setup)
3. ✅ Supabase CLI (butuh install)

## ⏱️ BERAPA LAMA?

- Apply SQL: **1 menit**
- Test & verifikasi: **2 menit**
- Total: **3 menit** ⚡

## 📊 SETELAH FIX

Order yang sudah expired (seperti DEV-T444563095289GYBH):
- ✅ Status berubah `submitted` → `cancelled`
- ✅ User dapat notifikasi
- ✅ Tidak muncul di halaman "Belum dibayar" lagi

## ❓ JIKA ADA ERROR

Kalau dapat error saat run SQL:
1. Screenshot error message
2. Kasih tau saya error-nya apa

---

**🔗 Quick Links:**
- SQL Editor: https://supabase.com/dashboard/project/vtwooclhjobgdgvljauq/sql/new
- Project Dashboard: https://supabase.com/dashboard/project/vtwooclhjobgdgvljauq

**📁 Files:**
- `APPLY_THIS_SQL_FIX.sql` - SQL yang perlu di-apply
- `fix_auto_cancel_pending_orders.sql` - Same content (backup)
