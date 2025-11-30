-- ============================================
-- Notification for Return Request Approved
-- ============================================
-- Trigger: Ketika return status berubah ke 'approved'
-- Message: "Permintaan pengembalian untuk id pesanan [ID] telah disetujui. Harap kemas kembali barang dan atur pengiriman sebelum [tanggal bulan tahun] pukul [jam:menit]"

-- Drop existing function if any
DROP FUNCTION IF EXISTS create_notification_on_return_approved() CASCADE;

-- Create function to create notification when return is approved
CREATE OR REPLACE FUNCTION create_notification_on_return_approved()
RETURNS TRIGGER AS $$
DECLARE
  order_id_display TEXT;
  deadline_date TIMESTAMPTZ;
  deadline_text TEXT;
BEGIN
  -- Only create notification if status changed from 'pending' to 'approved'
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN

    -- Format order ID: 10 characters uppercase without dashes
    order_id_display := UPPER(SUBSTRING(REPLACE(NEW.order_id::text, '-', ''), 1, 10));

    -- Calculate deadline: approved_at + 2 days (48 hours)
    -- If approved_at is NULL, use NOW() + 2 days
    -- Round deadline to end of the hour (:59) for consistency with hourly cron job
    -- Convert to Asia/Jakarta timezone (WIB = UTC+7)
    deadline_date := timezone('Asia/Jakarta',
      date_trunc('hour', COALESCE(NEW.approved_at, NOW()) + INTERVAL '2 days')
      + INTERVAL '59 minutes 59 seconds');

    -- Format deadline in Indonesian: "14 November 2025 pukul 16:00"
    deadline_text := TO_CHAR(deadline_date, 'DD FMMonth YYYY') || ' pukul ' || TO_CHAR(deadline_date, 'HH24:MI');

    INSERT INTO public.notifications (
      user_id,
      order_id,
      type,
      title,
      message
    ) VALUES (
      NEW.user_id,
      NEW.order_id,
      'return_request_approved',
      'Permintaan Pengembalian Disetujui',
      'Permintaan pengembalian untuk id pesanan ' || order_id_display || ' telah disetujui. Harap kemas kembali barang dan atur pengiriman sebelum ' || deadline_text
    );

    -- Log untuk debugging
    RAISE NOTICE 'Return approved notification created for order % - Deadline: %', order_id_display, deadline_text;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_notification_on_return_approved ON public.returns;

-- Create trigger: Notification when return status changes to 'approved'
CREATE TRIGGER trigger_notification_on_return_approved
  AFTER UPDATE OF status ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_return_approved();

-- Grant necessary permissions
GRANT SELECT ON public.notifications TO authenticated;

-- Verify trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_return_approved';
