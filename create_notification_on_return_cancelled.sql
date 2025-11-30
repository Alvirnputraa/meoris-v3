-- ============================================
-- Notification for Return Request Cancelled
-- ============================================
-- Trigger: Ketika return status berubah ke 'expired' (auto-cancelled)
-- Message: "Anda tidak mengatur pengiriman dalam waktu yang ditentukan. Permintaan pengembalian dibatalkan dan pesanan terselesaikan."

-- Drop existing function if any
DROP FUNCTION IF EXISTS create_notification_on_return_cancelled() CASCADE;

-- Create function to create notification when return is cancelled (expired)
CREATE OR REPLACE FUNCTION create_notification_on_return_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  order_id_display TEXT;
BEGIN
  -- Only create notification if status changed to 'expired'
  IF NEW.status = 'expired' AND (OLD.status IS NULL OR OLD.status != 'expired') THEN

    -- Format order ID: 10 characters uppercase without dashes
    order_id_display := UPPER(SUBSTRING(REPLACE(NEW.order_id::text, '-', ''), 1, 10));

    INSERT INTO public.notifications (
      user_id,
      order_id,
      type,
      title,
      message
    ) VALUES (
      NEW.user_id,
      NEW.order_id,
      'return_cancelled',
      'Permintaan Pengembalian Dibatalkan',
      'Anda tidak mengatur pengiriman dalam waktu yang ditentukan. Permintaan pengembalian untuk id pesanan ' || order_id_display || ' dibatalkan dan pesanan terselesaikan.'
    );

    -- Log untuk debugging
    RAISE NOTICE 'Return cancelled notification created for order %', order_id_display;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_notification_on_return_cancelled ON public.returns;

-- Create trigger: Notification when return status changes to 'expired'
CREATE TRIGGER trigger_notification_on_return_cancelled
  AFTER UPDATE OF status ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_return_cancelled();

-- Grant necessary permissions
GRANT SELECT ON public.notifications TO authenticated;

-- Verify trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_return_cancelled';
