-- ===== CREATE NOTIFICATIONS FOR EXISTING PAID ORDERS =====
-- Use this to create notifications for orders that existed BEFORE trigger was installed

-- Step 1: Preview which orders will get notifications
SELECT
  'Preview: Orders that will get notifications' as step,
  o.id as order_id,
  o.user_id,
  o.status,
  o.created_at,
  u.email as user_email,
  CASE
    WHEN o.user_id IS NULL THEN '❌ Skip - user_id NULL'
    WHEN u.id IS NULL THEN '❌ Skip - user not in auth.users'
    WHEN n.id IS NOT NULL THEN '⏭️ Skip - notification already exists'
    ELSE '✅ Will create notification'
  END as action
FROM public.orders o
LEFT JOIN auth.users u ON u.id = o.user_id
LEFT JOIN public.notifications n ON n.order_id = o.id AND n.type = 'payment_success'
WHERE o.status = 'paid'
ORDER BY o.created_at DESC;

-- Step 2: Count how many notifications will be created
SELECT
  'Summary' as step,
  COUNT(*) as total_paid_orders,
  COUNT(*) FILTER (WHERE u.id IS NOT NULL AND n.id IS NULL) as will_create_count,
  COUNT(*) FILTER (WHERE n.id IS NOT NULL) as already_has_notification,
  COUNT(*) FILTER (WHERE o.user_id IS NULL) as skip_null_user,
  COUNT(*) FILTER (WHERE o.user_id IS NOT NULL AND u.id IS NULL) as skip_invalid_user
FROM public.orders o
LEFT JOIN auth.users u ON u.id = o.user_id
LEFT JOIN public.notifications n ON n.order_id = o.id AND n.type = 'payment_success'
WHERE o.status = 'paid';

-- Step 3: CREATE NOTIFICATIONS for existing orders
-- This will insert notifications for all paid orders that don't have one yet
INSERT INTO public.notifications (user_id, order_id, type, title, message, created_at)
SELECT
  o.user_id,
  o.id,
  'payment_success',
  'Pembayaran Berhasil',
  'Pembayaran berhasil. Pesananmu sekarang sedang dikemas',
  o.created_at -- Use order's created_at so notification appears with correct timestamp
FROM public.orders o
INNER JOIN auth.users u ON u.id = o.user_id -- Only for valid users
LEFT JOIN public.notifications n ON n.order_id = o.id AND n.type = 'payment_success'
WHERE o.status = 'paid'
  AND o.user_id IS NOT NULL
  AND n.id IS NULL -- Don't create duplicate
;

-- Step 4: Verify notifications were created
SELECT
  'Verification: Notifications Created' as step,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 minute') as just_created,
  MIN(created_at) as oldest_notification,
  MAX(created_at) as newest_notification
FROM public.notifications
WHERE type = 'payment_success';

-- Step 5: Show sample notifications
SELECT
  'Sample Notifications' as step,
  n.id,
  n.user_id,
  n.order_id,
  n.title,
  n.created_at,
  u.email as user_email
FROM public.notifications n
JOIN auth.users u ON u.id = n.user_id
WHERE n.type = 'payment_success'
ORDER BY n.created_at DESC
LIMIT 5;
