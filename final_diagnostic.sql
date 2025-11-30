-- ===== FINAL DIAGNOSTIC: Why No Notifications? =====

-- 1. Check ALL paid orders and their user_id status
SELECT
  'All Paid Orders Analysis' as check,
  COUNT(*) as total_paid_orders,
  COUNT(*) FILTER (WHERE user_id IS NULL) as orders_with_null_user_id,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = orders.user_id)) as orders_with_invalid_user_id,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = orders.user_id)) as orders_with_valid_user_id
FROM public.orders
WHERE status = 'paid';

-- 2. Show ACTUAL user_id values in orders
SELECT
  'Sample Order User IDs' as check,
  o.id as order_id,
  o.user_id,
  o.created_at,
  EXISTS (SELECT 1 FROM auth.users WHERE id = o.user_id) as user_exists_in_auth_users
FROM public.orders o
WHERE o.status = 'paid'
ORDER BY o.created_at DESC
LIMIT 5;

-- 3. Show ALL users in auth.users
SELECT
  'All Users in auth.users' as check,
  id as user_id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- 4. Try to match - show if ANY order user_id matches ANY auth.users
SELECT
  'Matching Check' as check,
  o.user_id as order_user_id,
  u.id as auth_user_id,
  u.email,
  CASE
    WHEN o.user_id = u.id THEN '✅ MATCH'
    ELSE '❌ NO MATCH'
  END as match_status
FROM public.orders o
CROSS JOIN auth.users u
WHERE o.status = 'paid'
LIMIT 10;

-- 5. Check if there's a different user_id format issue
SELECT
  'User ID Format Check' as check,
  'Order user_id type: ' || pg_typeof(user_id)::text as order_user_id_type,
  'Auth user_id type: ' || pg_typeof((SELECT id FROM auth.users LIMIT 1))::text as auth_user_id_type
FROM public.orders
LIMIT 1;
