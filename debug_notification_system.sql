-- ===== COMPREHENSIVE NOTIFICATION SYSTEM DEBUG =====

-- 1. Check orders table structure (crucial - must have user_id column)
SELECT
  'Orders Table Columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name IN ('id', 'user_id', 'status', 'created_at')
ORDER BY column_name;

-- 2. Check recent orders with user_id (last 5 orders)
SELECT
  'Recent Orders' as check_type,
  id,
  user_id,
  status,
  total_amount,
  created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if notifications table exists and its structure
SELECT
  'Notifications Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 4. Check all notifications (admin view - bypassing RLS temporarily)
SELECT
  'All Notifications Count' as check_type,
  COUNT(*) as total_notifications
FROM public.notifications;

-- 5. Show last 10 notifications
SELECT
  'Last 10 Notifications' as check_type,
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

-- 6. Check if triggers exist
SELECT
  'Trigger Check' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_notification_on_order_insert',
  'trigger_notification_on_payment_success'
);

-- 7. Check if trigger functions exist
SELECT
  'Function Check' as check_type,
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname IN (
  'create_notification_on_order_insert',
  'create_notification_on_payment_success'
);

-- 8. Check RLS policies on notifications
SELECT
  'RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- 9. Check RLS is enabled
SELECT
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'notifications';

-- 10. Count orders without user_id (this is BAD if > 0)
SELECT
  'Orders Without user_id' as check_type,
  COUNT(*) as count_without_user_id,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as count_with_user_id
FROM public.orders
WHERE created_at > NOW() - INTERVAL '7 days';

-- 11. Get specific order by ID (replace with actual order_id from checkout)
-- Uncomment and replace ORDER_ID after user provides it
-- SELECT
--   'Specific Order Detail' as check_type,
--   id,
--   user_id,
--   status,
--   total_amount,
--   created_at
-- FROM public.orders
-- WHERE id = 'PASTE_ORDER_ID_HERE'::uuid;

-- 12. Check if there are ANY notifications for recent orders
SELECT
  'Notifications vs Orders Match' as check_type,
  o.id as order_id,
  o.user_id,
  o.status as order_status,
  o.created_at as order_created_at,
  n.id as notification_id,
  n.type as notification_type,
  n.created_at as notification_created_at
FROM public.orders o
LEFT JOIN public.notifications n ON n.order_id = o.id
WHERE o.created_at > NOW() - INTERVAL '24 hours'
ORDER BY o.created_at DESC
LIMIT 10;
