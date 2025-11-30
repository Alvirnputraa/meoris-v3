-- ===== TEST TRIGGER WITH DETAILED LOGGING =====

-- First, let's recreate the trigger function with MORE logging
DROP TRIGGER IF EXISTS trigger_notification_on_order_paid_insert ON public.orders;

CREATE OR REPLACE FUNCTION create_notification_on_order_paid_insert()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TRIGGER FIRED: create_notification_on_order_paid_insert';
  RAISE NOTICE 'Order ID: %', NEW.id;
  RAISE NOTICE 'Order Status: %', NEW.status;
  RAISE NOTICE 'Order user_id: %', NEW.user_id;
  RAISE NOTICE '========================================';

  IF NEW.status = 'paid' AND NEW.user_id IS NOT NULL THEN
    RAISE NOTICE 'Status is paid and user_id is not null';

    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
      RAISE NOTICE 'User exists in auth.users, inserting notification...';

      INSERT INTO public.notifications (
        user_id,
        order_id,
        type,
        title,
        message
      ) VALUES (
        NEW.user_id,
        NEW.id,
        'payment_success',
        'Pembayaran Berhasil',
        'Pembayaran berhasil. Pesananmu sekarang sedang dikemas'
      );

      RAISE NOTICE 'Notification inserted successfully!';
    ELSE
      RAISE WARNING 'Cannot create notification: user_id % does not exist in auth.users', NEW.user_id;
    END IF;
  ELSIF NEW.status = 'paid' AND NEW.user_id IS NULL THEN
    RAISE WARNING 'Cannot create notification: user_id is NULL for order %', NEW.id;
  ELSE
    RAISE NOTICE 'Trigger conditions not met: status=%, user_id=%', NEW.status, NEW.user_id;
  END IF;

  RAISE NOTICE '======================================== END';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notification_on_order_paid_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_order_paid_insert();

-- Verify trigger is installed
SELECT
  'Trigger Installed' as status,
  trigger_name,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_paid_insert';
