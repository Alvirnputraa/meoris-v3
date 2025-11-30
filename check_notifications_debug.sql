-- ===== DEBUG SCRIPT: Check Notifications System =====

-- 1. Check if notifications table exists
SELECT
  'Table exists' as check_type,
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
  ) as result;

-- 2. Check all notifications in table (as admin)
SELECT
  'All notifications' as check_type,
  COUNT(*) as total_count
FROM public.notifications;

-- 3. Check recent notifications (last 10)
SELECT
  id,
  user_id,
  order_id,
  type,
  title,
  message,
  is_read,
  created_at
FROM public.notifications
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if triggers exist
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_notification_on_order_insert',
  'trigger_notification_on_payment_success'
);

-- 5. Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'notifications';

-- 6. Check recent orders (last 5)
SELECT
  id,
  user_id,
  status,
  total_amount,
  created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check if user_id exists in orders table
SELECT
  'Order has user_id' as check_type,
  COUNT(*) as orders_with_user_id,
  COUNT(*) FILTER (WHERE user_id IS NULL) as orders_without_user_id
FROM public.orders
WHERE created_at > NOW() - INTERVAL '1 day';

-- ===== MANUAL TEST: Create a test notification =====
-- Uncomment dan ganti USER_ID dan ORDER_ID dengan data real untuk test manual

-- INSERT INTO public.notifications (
--   user_id,
--   order_id,
--   type,
--   title,
--   message
-- ) VALUES (
--   'YOUR_USER_ID_HERE'::uuid,  -- Ganti dengan user_id yang sedang login
--   'YOUR_ORDER_ID_HERE'::uuid,  -- Ganti dengan order_id yang baru dibuat
--   'order_created',
--   'Test Notifikasi',
--   'Ini adalah test notifikasi manual'
-- );
