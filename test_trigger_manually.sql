-- ===== MANUAL TRIGGER TEST =====
-- This will manually test the trigger function for your recent order

-- Step 1: Get order details
SELECT
  'Order Details' as step,
  o.id,
  o.user_id,
  o.status,
  o.created_at,
  u.id as user_exists_in_auth_users,
  u.email
FROM public.orders o
LEFT JOIN auth.users u ON u.id = o.user_id
WHERE o.id = '00d8eb18-280b-4ddf-9915-26dd0f05fac3';

-- Step 2: Check if user_id is valid
DO $$
DECLARE
  v_user_id uuid := '00d8eb18-280b-4ddf-9915-26dd0f05fac3'; -- order_id from your result
  v_order record;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = v_user_id;

  RAISE NOTICE 'Testing trigger conditions for order: %', v_user_id;
  RAISE NOTICE 'Order user_id: %', v_order.user_id;
  RAISE NOTICE 'Order status: %', v_order.status;

  IF v_order.user_id IS NULL THEN
    RAISE NOTICE '❌ PROBLEM: user_id is NULL';
  ELSIF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_order.user_id) THEN
    RAISE NOTICE '❌ PROBLEM: user_id does not exist in auth.users';
    RAISE NOTICE 'user_id value: %', v_order.user_id;
  ELSE
    RAISE NOTICE '✅ user_id is valid: %', (SELECT email FROM auth.users WHERE id = v_order.user_id);
    RAISE NOTICE 'Trigger SHOULD have created notification';
  END IF;
END $$;

-- Step 3: Manually create notification (bypass trigger)
INSERT INTO public.notifications (
  user_id,
  order_id,
  type,
  title,
  message,
  created_at
)
SELECT
  o.user_id,
  o.id,
  'payment_success',
  'Pembayaran Berhasil',
  'Pembayaran berhasil. Pesananmu sekarang sedang dikemas',
  o.created_at
FROM public.orders o
WHERE o.id = '00d8eb18-280b-4ddf-9915-26dd0f05fac3'
  AND o.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = o.user_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE order_id = o.id AND type = 'payment_success'
  )
RETURNING
  id as notification_id,
  user_id,
  order_id,
  title,
  message,
  created_at;

-- Step 4: Verify
SELECT
  'Notification Created' as status,
  n.*,
  u.email as user_email
FROM public.notifications n
JOIN auth.users u ON u.id = n.user_id
WHERE n.order_id = '00d8eb18-280b-4ddf-9915-26dd0f05fac3';
