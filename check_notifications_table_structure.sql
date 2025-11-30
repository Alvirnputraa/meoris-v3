-- ===== CHECK NOTIFICATIONS TABLE STRUCTURE =====

-- 1. Check table structure
SELECT
  'Table Structure' as check,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 2. Check foreign key constraints
SELECT
  'Foreign Keys' as check,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.notifications'::regclass;

-- 3. Check if notifications table is actually accessible
SELECT
  'Table Access Test' as check,
  COUNT(*) as can_access
FROM public.notifications;

-- 4. Test manual insert with a valid user
-- First get a valid user
SELECT
  'Valid User for Testing' as check,
  id as user_id,
  email
FROM auth.users
ORDER BY created_at DESC
LIMIT 1;

-- 5. Get latest paid order
SELECT
  'Latest Paid Order' as check,
  o.id as order_id,
  o.user_id,
  o.status,
  o.created_at,
  u.email as user_email,
  EXISTS (SELECT 1 FROM auth.users WHERE id = o.user_id) as user_exists
FROM public.orders o
LEFT JOIN auth.users u ON u.id = o.user_id
WHERE o.status = 'paid'
ORDER BY o.created_at DESC
LIMIT 1;
