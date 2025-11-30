# ⚡ QUICK FIX - Auto Cancel Pending Orders

## 🎯 THE PROBLEM
Auto-cancel cron job is running but **NOT cancelling expired orders**.

Order `DEV-T44456309298ICSIL` was expired 20+ hours ago but still showing "Belum dibayar".

## ✅ QUICK SOLUTION (2 STEPS)

### Step 1: Apply Database Fix (REQUIRED)

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard
   - Click your project
   - Go to: **SQL Editor**

2. **Copy & Run This SQL**:

```sql
-- =====================================================
-- AUTO CANCEL PENDING ORDERS FUNCTION (FIXED VERSION)
-- =====================================================
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

GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO service_role;
```

3. **Click RUN** (or press Ctrl/Cmd + Enter)

### Step 2: Test It Works

Run this command on your Ubuntu server:

```bash
# Manual test the cron endpoint
curl -s -H "Authorization: Bearer K3mP9xR7vN2sL5qW8tY4zH6jD1cF0aB3==" \
  http://localhost:3005/api/cron/auto-cancel-pending-orders | jq

# Check the logs
tail -f /var/log/meoris-cron.log
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Auto-cancel pending orders job executed successfully",
  "ordersCancelled": 0,  // Will be > 0 if there are new expired orders
  "timestamp": "2025-11-18T..."
}
```

## 🧪 VERIFICATION COMMANDS

If you want to verify locally before deploying:

```bash
# Check if there are any expired orders
node diagnose_and_fix_auto_cancel.js

# Check specific order
node debug_order_DEV-T44456309298ICSIL.js
```

## 📊 WHAT CHANGED?

### BEFORE (Broken) ❌
```sql
-- Only checked 'orders' table
-- Used created_at + 24 hours (wrong!)
WHERE status IN ('pending', 'belum bayar')
  AND created_at < NOW() - INTERVAL '24 hours'
```

### AFTER (Fixed) ✅
```sql
-- Checks 'checkout_submissions' table (correct!)
-- Uses payment_expired_at field (correct!)
WHERE status = 'submitted'
  AND payment_expired_at < NOW()
```

## ⏱️ TIMELINE

- **Cron runs**: Every 10 minutes (already configured)
- **Fix takes**: ~1 minute to apply
- **Next auto-cancel**: Within 10 minutes after fix

## ✅ DONE!

After applying the SQL:
- ✅ Expired orders will be auto-cancelled every 10 minutes
- ✅ Users will receive "Pesanan dibatalkan" notification
- ✅ Order status will change from "submitted" to "cancelled"

---

**Note**: Order `DEV-T44456309298ICSIL` has already been cancelled manually as a temporary fix.
