# 🚨 CARA APPLY SQL FIX - STEP BY STEP

## ⚠️ MASALAH YANG TERBUKTI

1. ✅ Logic auto-cancel **BENAR** (sudah di-test manual, berhasil!)
2. ✅ Table & column names **BENAR**
3. ❌ Database function **BELUM TER-UPDATE** di Supabase

**Bukti**: Manual cancel berhasil, tapi function return `cancelled_count: 0`

## 🎯 SOLUSI: APPLY SQL FIX KE SUPABASE

### ⚡ STEP-BY-STEP (5 MENIT)

#### 1. Buka Supabase SQL Editor

Klik link ini (akan langsung ke project Anda):

👉 **https://supabase.com/dashboard/project/vtwooclhjobgdgvljauq/sql/new**

Atau manual:
- Login ke https://supabase.com
- Pilih project: `vtwooclhjobgdgvljauq`
- Klik **"SQL Editor"** di sidebar kiri
- Klik **"New query"**

#### 2. Copy SQL Fix

Buka file: `FINAL_SQL_FIX.sql` yang ada di project folder

Atau copy dari sini:

```sql
-- Drop existing function first
DROP FUNCTION IF EXISTS auto_cancel_pending_orders();

-- Create the corrected function
CREATE OR REPLACE FUNCTION auto_cancel_pending_orders()
RETURNS TABLE(cancelled_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_count INTEGER := 0;
  v_checkout_record RECORD;
BEGIN
  RAISE NOTICE '[AUTO-CANCEL] Starting auto-cancel job at %', NOW();

  FOR v_checkout_record IN
    SELECT
      id,
      user_id,
      payment_reference,
      payment_expired_at
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

      RAISE NOTICE '[AUTO-CANCEL] Cancelled checkout: % (expired at %)',
        v_checkout_record.payment_reference,
        v_checkout_record.payment_expired_at;

      BEGIN
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
      EXCEPTION WHEN foreign_key_violation THEN
        RAISE WARNING '[AUTO-CANCEL] Could not create notification for user %', v_checkout_record.user_id;
      END;

      v_cancelled_count := v_cancelled_count + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[AUTO-CANCEL] Error cancelling checkout %: %', v_checkout_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[AUTO-CANCEL] Completed. Total cancelled: %', v_cancelled_count;

  RETURN QUERY SELECT v_cancelled_count;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO service_role;
GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO anon;

SELECT * FROM auto_cancel_pending_orders();
```

#### 3. Paste & Run

1. **Paste** SQL di atas ke SQL Editor (Ctrl+V / Cmd+V)
2. Klik tombol **"Run"** (atau tekan `Ctrl+Enter` / `Cmd+Enter`)
3. Tunggu beberapa detik

#### 4. Cek Hasil

Setelah run, Anda akan lihat di bagian bawah:

**✅ BERHASIL jika muncul:**
```
Success
cancelled_count: 0 (atau angka lain)
```

**❌ GAGAL jika muncul:**
```
Error: ...
```

Jika gagal, screenshot error-nya dan kasih tau saya.

## 🧪 TEST SETELAH APPLY

### Test 1: Cek Function via Code
```bash
node check_function_definition.js
```

**Expected output:**
```
Function returned cancelled_count: 0
Expected to cancel: 0
Match? ✅ YES
```

### Test 2: Manual Trigger Cron
```bash
curl -s -H "Authorization: Bearer K3mP9xR7vN2sL5qW8tY4zH6jD1cF0aB3==" \
  http://localhost:3005/api/cron/auto-cancel-pending-orders
```

**Expected output:**
```json
{
  "success": true,
  "message": "Auto-cancel pending orders job executed successfully",
  "ordersCancelled": 0,
  "timestamp": "..."
}
```

### Test 3: Buat Order Baru & Test
```bash
# 1. Buat order dengan deadline 5 menit ke depan
# 2. Tunggu sampai expired
# 3. Trigger cron atau tunggu 10 menit
# 4. Cek status berubah ke 'cancelled'
```

## ❓ TROUBLESHOOTING

### Jika dapat error "permission denied"
- Pastikan Anda login sebagai **owner** project
- Atau gunakan account yang punya **admin access**

### Jika dapat error "syntax error"
- Pastikan copy SEMUA SQL (dari DROP sampai SELECT)
- Jangan ada karakter aneh atau incomplete

### Jika function masih return 0
1. Pastikan SQL benar-benar di-run (lihat "Success" message)
2. Coba run ulang SQL-nya
3. Test dengan: `node check_function_definition.js`

## 📊 VERIFICATION CHECKLIST

Setelah apply SQL, pastikan:

- [ ] SQL Editor menunjukkan "Success"
- [ ] Function dapat dipanggil tanpa error
- [ ] `node check_function_definition.js` menunjukkan Match: ✅ YES
- [ ] Cron log tidak lagi menunjukkan `ordersCancelled: 0` untuk order yang expired

## 🎯 SETELAH FIX BERHASIL

Order yang sudah expired akan:
- ✅ Auto-cancelled setiap 10 menit oleh cron
- ✅ Status berubah `submitted` → `cancelled`
- ✅ User dapat notifikasi (jika foreign key ok)
- ✅ Tidak muncul di list "Belum dibayar"

---

**📞 NEED HELP?**

Jika masih ada masalah setelah apply SQL:
1. Screenshot error message dari Supabase
2. Run: `node check_function_definition.js`
3. Share hasilnya

---

**⏰ ESTIMATED TIME: 5 MINUTES**
**💡 DIFFICULTY: EASY (just copy-paste)**
