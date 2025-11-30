-- ===== DEBUG: Why Notification Not Created? =====

-- 1. Check if triggers are actually installed
SELECT
  '1. Triggers Installed?' as check_step,
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'orders'
  AND trigger_name LIKE '%notification%'
ORDER BY trigger_name;

-- 2. Check recent paid orders
SELECT
  '2. Recent Paid Orders' as check_step,
  id as order_id,
  user_id,
  status,
  created_at,
  CASE
    WHEN user_id IS NULL THEN '❌ user_id is NULL'
    WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE id = orders.user_id) THEN '❌ user not in auth.users'
    ELSE '✅ user_id valid'
  END as validation
FROM public.orders
WHERE status = 'paid'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if any notifications exist at all
SELECT
  '3. Notifications Table Status' as check_step,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE type = 'payment_success') as payment_success_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as recent_count
FROM public.notifications;

-- 4. Check the MOST RECENT order details
SELECT
  '4. Most Recent Order Detail' as check_step,
  o.id as order_id,
  o.user_id,
  o.status,
  o.created_at as order_created_at,
  u.id as user_exists_in_auth,
  u.email as user_email,
  n.id as notification_id,
  n.created_at as notification_created_at,
  CASE
    WHEN o.user_id IS NULL THEN '❌ Trigger skipped: user_id is NULL'
    WHEN u.id IS NULL THEN '❌ Trigger skipped: user not found in auth.users'
    WHEN n.id IS NOT NULL THEN '✅ Notification created'
    ELSE '❓ Notification NOT created (trigger may not have fired)'
  END as diagnosis
FROM public.orders o
LEFT JOIN auth.users u ON u.id = o.user_id
LEFT JOIN public.notifications n ON n.order_id = o.id AND n.type = 'payment_success'
WHERE o.status = 'paid'
ORDER BY o.created_at DESC
LIMIT 1;

-- 5. Check Postgres logs for warnings
-- (This query shows if trigger raised any warnings)
-- Note: You need to check Supabase Dashboard → Logs → Postgres Logs manually

-- 6. Test if trigger function can be called manually
-- Get the most recent paid order
DO $$
DECLARE
  v_order_id uuid;
  v_user_id uuid;
  v_status text;
BEGIN
  -- Get most recent paid order
  SELECT id, user_id, status INTO v_order_id, v_user_id, v_status
  FROM public.orders
  WHERE status = 'paid'
  ORDER BY created_at DESC
  LIMIT 1;

  RAISE NOTICE '6. Manual Trigger Test:';
  RAISE NOTICE 'Order ID: %', v_order_id;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Status: %', v_status;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Problem: user_id is NULL';
  ELSIF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE NOTICE '❌ Problem: user_id % does not exist in auth.users', v_user_id;
  ELSE
    RAISE NOTICE '✅ user_id is valid';
    RAISE NOTICE 'User exists in auth.users: %', (SELECT email FROM auth.users WHERE id = v_user_id);
  END IF;
END $$;

-- 7. Check if there are ANY orders created AFTER trigger was installed
SELECT
  '7. Orders Created After Trigger Installation' as check_step,
  COUNT(*) as count,
  MAX(created_at) as most_recent_order
FROM public.orders
WHERE created_at > NOW() - INTERVAL '10 minutes';

-- 8. Try to manually insert a test notification for most recent order
-- (Uncomment to test if RLS allows insert)
-- DO $$
-- DECLARE
--   v_order_id uuid;
--   v_user_id uuid;
-- BEGIN
--   SELECT id, user_id INTO v_order_id, v_user_id
--   FROM public.orders
--   WHERE status = 'paid'
--   ORDER BY created_at DESC
--   LIMIT 1;
--
--   IF v_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
--     INSERT INTO public.notifications (user_id, order_id, type, title, message)
--     VALUES (v_user_id, v_order_id, 'payment_success', 'Test Manual', 'Test notification manual');
--     RAISE NOTICE 'Manual notification inserted successfully';
--   ELSE
--     RAISE NOTICE 'Cannot insert: invalid user_id';
--   END IF;
-- END $$;

-- 9. IMPORTANT: Check if order was created BEFORE or AFTER trigger installation
-- If order was created BEFORE trigger was installed, trigger won't fire for old orders
SELECT
  '9. Timeline Check' as check_step,
  id as order_id,
  created_at as order_created_at,
  NOW() as current_time,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago,
  CASE
    WHEN created_at < NOW() - INTERVAL '10 minutes' THEN '⚠️ OLD ORDER - Created before trigger installation (trigger will NOT fire)'
    ELSE '✅ RECENT ORDER - Should have triggered'
  END as timeline_status
FROM public.orders
WHERE status = 'paid'
ORDER BY created_at DESC
LIMIT 1;
