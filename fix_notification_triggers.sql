-- ===== FIX NOTIFICATION TRIGGERS =====
-- Problem: Order dibuat langsung dengan status 'paid', bukan 'UNPAID'
-- Solution: Ubah trigger untuk handle insert order dengan status 'paid'

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS trigger_notification_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_notification_on_payment_success ON public.orders;
DROP FUNCTION IF EXISTS create_notification_on_order_insert();
DROP FUNCTION IF EXISTS create_notification_on_payment_success();

-- New function: Create notification when order is inserted with status 'paid'
CREATE OR REPLACE FUNCTION create_notification_on_order_paid_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- When order is created with status 'paid' (payment already successful)
  -- Only create notification if user_id is valid (not NULL)
  IF NEW.status = 'paid' AND NEW.user_id IS NOT NULL THEN
    -- Verify user exists in auth.users before inserting
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
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
    ELSE
      -- Log error if user_id doesn't exist in auth.users
      RAISE WARNING 'Cannot create notification: user_id % does not exist in auth.users', NEW.user_id;
    END IF;
  ELSIF NEW.status = 'paid' AND NEW.user_id IS NULL THEN
    -- Log error if user_id is NULL
    RAISE WARNING 'Cannot create notification: user_id is NULL for order %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New trigger: Fire when new order is inserted
CREATE TRIGGER trigger_notification_on_order_paid_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_order_paid_insert();

-- Optional: Keep this for future if you want notification when status changes to paid
-- (Currently not needed because order is created directly with paid status)
CREATE OR REPLACE FUNCTION create_notification_on_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status changed from other status to paid
  IF OLD.status != 'paid' AND NEW.status = 'paid' AND NEW.user_id IS NOT NULL THEN
    -- Check if notification already exists to prevent duplicate
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE order_id = NEW.id AND type = 'payment_success'
    ) THEN
      -- Verify user exists before inserting
      IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
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
      ELSE
        RAISE WARNING 'Cannot create notification on update: user_id % does not exist in auth.users', NEW.user_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notification_on_status_update
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_status_update();

-- Verify triggers are created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_notification_on_order_paid_insert',
  'trigger_notification_on_status_update'
)
ORDER BY trigger_name;
