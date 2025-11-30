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

-- Verify trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_shipped';
