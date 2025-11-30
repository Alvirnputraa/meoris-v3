-- ===== CREATE NOTIFICATIONS FOR ALL PAID ORDERS =====
-- This will create notifications for all existing paid orders

-- Step 1: Preview orders that will get notifications
SELECT
  'Preview' as step,
  o.id as order_id,
  o.user_id,
  o.status,
  o.created_at,
  u.email,
  CASE
    WHEN o.user_id IS NULL THEN '❌ Skip - NULL user_id'
    WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE id = o.user_id) THEN '❌ Skip - User not in auth.users'
    WHEN EXISTS (SELECT 1 FROM notifications WHERE order_id = o.id AND type = 'payment_success') THEN '⏭️ Skip - Already has notification'
    ELSE '✅ Will create notification'
  END as action
FROM public.orders o
LEFT JOIN auth.users u ON u.id = o.user_id
WHERE o.status = 'paid'
ORDER BY o.created_at DESC
LIMIT 20;

-- Step 2: Create notifications for ALL paid orders
INSERT INTO public.notifications (user_id, order_id, type, title, message, created_at)
SELECT
  o.user_id,
  o.id,
  'payment_success',
  'Pembayaran Berhasil',
  'Pembayaran berhasil. Pesananmu sekarang sedang dikemas',
  o.created_at
FROM public.orders o
WHERE o.status = 'paid'
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
  created_at;

-- Step 3: Verify notifications created
SELECT
  'Notifications Created' as result,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT order_id) as unique_orders,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM public.notifications
WHERE type = 'payment_success';

-- Step 4: Show sample notifications
SELECT
  'Sample Notifications' as result,
  n.id,
  n.user_id,
  u.email,
  n.order_id,
  n.title,
  n.message,
  n.created_at
FROM public.notifications n
JOIN auth.users u ON u.id = n.user_id
WHERE n.type = 'payment_success'
ORDER BY n.created_at DESC
LIMIT 10;
