-- ===== SAFE FIX: NOTIFICATION TRIGGERS =====
-- This version safely drops and recreates everything

-- Step 1: Drop ALL existing notification triggers and functions
DROP TRIGGER IF EXISTS trigger_notification_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_notification_on_payment_success ON public.orders;
DROP TRIGGER IF EXISTS trigger_notification_on_order_paid_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_notification_on_status_update ON public.orders;

DROP FUNCTION IF EXISTS create_notification_on_order_insert();
DROP FUNCTION IF EXISTS create_notification_on_payment_success();
DROP FUNCTION IF EXISTS create_notification_on_order_paid_insert();
DROP FUNCTION IF EXISTS create_notification_on_status_update();

-- Step 2: Create new function for paid order insert (with validation)
CREATE OR REPLACE FUNCTION create_notification_on_order_paid_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if user_id is valid
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
      RAISE WARNING 'Cannot create notification: user_id % does not exist in auth.users', NEW.user_id;
    END IF;
  ELSIF NEW.status = 'paid' AND NEW.user_id IS NULL THEN
    RAISE WARNING 'Cannot create notification: user_id is NULL for order %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger for INSERT
CREATE TRIGGER trigger_notification_on_order_paid_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_order_paid_insert();

-- Step 4: Create function for status update (backup)
CREATE OR REPLACE FUNCTION create_notification_on_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'paid' AND NEW.status = 'paid' AND NEW.user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE order_id = NEW.id AND type = 'payment_success'
    ) THEN
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

-- Step 5: Create trigger for UPDATE
CREATE TRIGGER trigger_notification_on_status_update
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_status_update();

-- Step 6: Verify triggers are created
SELECT
  'Verification: Triggers Installed' as status,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_notification_on_order_paid_insert',
  'trigger_notification_on_status_update'
)
ORDER BY trigger_name;
