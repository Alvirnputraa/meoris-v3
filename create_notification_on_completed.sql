-- ============================================
-- Notification for Completed Orders
-- ============================================
-- Trigger: Ketika order status berubah ke 'completed'
-- Message: "Pesanan anda dengan id pesanan [ID] telah terselesaikan"

-- Drop existing function if any
DROP FUNCTION IF EXISTS create_notification_on_order_completed() CASCADE;

-- Create function to create notification when order is completed
CREATE OR REPLACE FUNCTION create_notification_on_order_completed()
RETURNS TRIGGER AS $$
DECLARE
  order_id_display TEXT;
BEGIN
  -- Only create notification if status changed from 'delivered' to 'completed'
  IF (OLD.status = 'delivered' OR OLD.status IS NULL)
     AND NEW.status = 'completed' THEN

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
      'order_completed',
      'Pesanan Terselesaikan',
      'Pesanan anda dengan id pesanan ' || order_id_display || ' telah terselesaikan'
    );

    -- Log untuk debugging
    RAISE NOTICE 'Completed notification created for order %', order_id_display;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_notification_on_order_completed ON public.orders;

-- Create trigger: Notification when order status changes to 'completed'
CREATE TRIGGER trigger_notification_on_order_completed
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_order_completed();

-- Grant necessary permissions
GRANT SELECT ON public.notifications TO authenticated;

-- Verify trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_completed';

-- Expected: 1 row showing the trigger
