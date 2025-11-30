-- ===== QUICK FIX: Create Notification for Recent Order =====
-- This will create notification for the most recent paid order

-- Step 1: Check the order first
SELECT
  'Order Details' as step,
  o.id as order_id,
  o.user_id,
  o.status,
  o.created_at,
  u.email as user_email,
  EXISTS (SELECT 1 FROM notifications WHERE order_id = o.id) as has_notification,
  CASE
    WHEN o.user_id IS NULL THEN '❌ Cannot create - user_id NULL'
    WHEN u.id IS NULL THEN '❌ Cannot create - user not in auth.users'
    WHEN EXISTS (SELECT 1 FROM notifications WHERE order_id = o.id AND type = 'payment_success') THEN '⏭️ Skip - notification already exists'
    ELSE '✅ Ready to create notification'
  END as status
FROM public.orders o
LEFT JOIN auth.users u ON u.id = o.user_id
WHERE o.status = 'paid'
ORDER BY o.created_at DESC
LIMIT 1;

-- Step 2: Create notification for the most recent order
INSERT INTO public.notifications (user_id, order_id, type, title, message, created_at)
SELECT
  o.user_id,
  o.id,
  'payment_success',
  'Pembayaran Berhasil',
  'Pembayaran berhasil. Pesananmu sekarang sedang dikemas',
  o.created_at
FROM public.orders o
INNER JOIN auth.users u ON u.id = o.user_id
LEFT JOIN public.notifications n ON n.order_id = o.id AND n.type = 'payment_success'
WHERE o.status = 'paid'
  AND o.id = '00d8eb18-280b-4ddf-9915-26dd0f05fac3' -- Your recent order ID
  AND n.id IS NULL -- Only if doesn't exist
RETURNING *;

-- Step 3: Verify notification was created
SELECT
  'Verification' as step,
  n.*,
  u.email as user_email
FROM public.notifications n
JOIN auth.users u ON u.id = n.user_id
WHERE n.order_id = '00d8eb18-280b-4ddf-9915-26dd0f05fac3';
