-- ============================================
-- FIX: Round UP Auto-Complete Time to Next Hour
-- ============================================
-- Problem: Cron runs every hour at :00, but notification shows :21, :59, etc
-- Solution: Round UP to next hour (:00)

-- Example:
-- Delivered: 14:21 → Auto-complete: +2 days = 14:21 → Round UP to 15:00
-- Delivered: 14:59 → Auto-complete: +2 days = 14:59 → Round UP to 15:00
-- Delivered: 15:00 → Auto-complete: +2 days = 15:00 → Stay 15:00

-- Drop existing function
DROP FUNCTION IF EXISTS create_notification_on_order_delivered() CASCADE;

-- Create FIXED function with round UP logic
CREATE OR REPLACE FUNCTION create_notification_on_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
  auto_complete_date TIMESTAMPTZ;
  auto_complete_date_local TIMESTAMP;
  formatted_date TEXT;
  order_id_display TEXT;
BEGIN
  -- Only create notification if status changed from 'shipped' to 'delivered'
  IF (OLD.status = 'shipped' OR OLD.status IS NULL)
     AND NEW.status = 'delivered'
     AND NEW.delivered_at IS NOT NULL THEN

    -- Calculate auto-complete date (delivered_at + 2 days)
    auto_complete_date := NEW.delivered_at + INTERVAL '2 days';

    -- Round UP to next hour because cron runs every hour at :00
    -- If minutes > 0, add 1 hour and truncate to hour
    IF EXTRACT(MINUTE FROM auto_complete_date) > 0 OR EXTRACT(SECOND FROM auto_complete_date) > 0 THEN
      auto_complete_date := DATE_TRUNC('hour', auto_complete_date) + INTERVAL '1 hour';
    ELSE
      auto_complete_date := DATE_TRUNC('hour', auto_complete_date);
    END IF;

    -- Convert to Asia/Jakarta timezone (WIB = GMT+7)
    auto_complete_date_local := auto_complete_date AT TIME ZONE 'Asia/Jakarta';

    -- Format: "12 Januari 2025 pukul 15:00" (rounded hour)
    formatted_date :=
      TO_CHAR(auto_complete_date_local, 'DD') || ' ' ||
      CASE TO_CHAR(auto_complete_date_local, 'MM')
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
      TO_CHAR(auto_complete_date_local, 'YYYY') || ' pukul ' ||
      TO_CHAR(auto_complete_date_local, 'HH24:MI');

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
    RAISE NOTICE 'Delivered notification created for order % - Auto-complete: % (Rounded to hour)',
      order_id_display, formatted_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notification_on_order_delivered ON public.orders;

CREATE TRIGGER trigger_notification_on_order_delivered
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_order_delivered();

-- Grant permissions
GRANT SELECT ON public.notifications TO authenticated;

-- ============================================
-- TEST: Verify Round UP Logic
-- ============================================

-- Test cases (run these to verify):
-- SELECT DATE_TRUNC('hour', TIMESTAMP '2025-11-12 14:21:00') + INTERVAL '1 hour';  -- Expected: 2025-11-12 15:00:00
-- SELECT DATE_TRUNC('hour', TIMESTAMP '2025-11-12 14:59:00') + INTERVAL '1 hour';  -- Expected: 2025-11-12 15:00:00
-- SELECT DATE_TRUNC('hour', TIMESTAMP '2025-11-12 15:00:00');                      -- Expected: 2025-11-12 15:00:00

-- ============================================
-- RE-TRIGGER EXISTING ORDERS (Optional)
-- ============================================

-- 1. Delete old notifications with wrong time
-- DELETE FROM notifications WHERE type = 'order_delivered';

-- 2. Re-trigger all delivered orders
-- UPDATE orders SET status = 'shipped' WHERE status = 'delivered';
-- UPDATE orders SET status = 'delivered', delivered_at = delivered_at WHERE status = 'shipped';

-- 3. Or just one order:
-- UPDATE orders SET status = 'shipped' WHERE id = '<order-id>';
-- UPDATE orders SET status = 'delivered', delivered_at = delivered_at WHERE id = '<order-id>';
