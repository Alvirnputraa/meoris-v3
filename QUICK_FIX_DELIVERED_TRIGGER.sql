-- ============================================
-- QUICK FIX: Delivered Notification Trigger
-- ============================================
-- Copy paste SEMUA query ini ke Supabase SQL Editor
-- Lalu klik RUN

-- Drop existing function/trigger jika ada
DROP TRIGGER IF EXISTS trigger_notification_on_order_delivered ON public.orders;
DROP FUNCTION IF EXISTS create_notification_on_order_delivered();

-- Create function (FIXED VERSION - tanpa locale error)
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

    -- Convert to Asia/Jakarta timezone (WIB = GMT+7)
    auto_complete_date_local := auto_complete_date AT TIME ZONE 'Asia/Jakarta';

    -- Format: "12 Januari 2025 pukul 14:30" (using local time)
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
    RAISE NOTICE 'Delivered notification created for order % - Auto-complete: %',
      order_id_display, formatted_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_notification_on_order_delivered
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_order_delivered();

-- Grant permissions
GRANT SELECT ON public.notifications TO authenticated;

-- Verify trigger created
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_delivered';

-- Expected: 1 row showing the trigger
