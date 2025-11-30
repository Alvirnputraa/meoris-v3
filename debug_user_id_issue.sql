-- ===== DEBUG: Foreign Key Constraint Issue =====
-- Error: "insert or update on table notifications violates foreign key constraint notifications_user_id_fkey"
-- This means user_id in orders doesn't exist in auth.users

-- 1. Check recent orders and their user_id validity
SELECT
  'Recent Orders User Validation' as check_type,
  o.id as order_id,
  o.user_id as order_user_id,
  o.status,
  o.created_at,
  CASE
    WHEN o.user_id IS NULL THEN 'NULL - INVALID'
    WHEN u.id IS NULL THEN 'USER NOT EXISTS IN auth.users - INVALID'
    ELSE 'VALID'
  END as validation_status,
  u.email as user_email
FROM public.orders o
LEFT JOIN auth.users u ON u.id = o.user_id
ORDER BY o.created_at DESC
LIMIT 10;

-- 2. Count orders with invalid user_id
SELECT
  'Invalid User Count' as check_type,
  COUNT(*) FILTER (WHERE user_id IS NULL) as null_user_id_count,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as has_user_id_count,
  COUNT(*) as total_orders
FROM public.orders
WHERE created_at > NOW() - INTERVAL '7 days';

-- 3. Find orders with user_id that don't exist in auth.users
SELECT
  'Orders with Non-existent Users' as check_type,
  o.id as order_id,
  o.user_id,
  o.status,
  o.created_at
FROM public.orders o
WHERE o.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = o.user_id
  )
ORDER BY o.created_at DESC
LIMIT 10;

-- 4. Check checkout_submissions for user_id validity
SELECT
  'Checkout Submissions User Validation' as check_type,
  cs.id as submission_id,
  cs.user_id as submission_user_id,
  cs.status,
  cs.created_at,
  CASE
    WHEN cs.user_id IS NULL THEN 'NULL - INVALID'
    WHEN u.id IS NULL THEN 'USER NOT EXISTS - INVALID'
    ELSE 'VALID'
  END as validation_status,
  u.email as user_email
FROM public.checkout_submissions cs
LEFT JOIN auth.users u ON u.id = cs.user_id
ORDER BY cs.created_at DESC
LIMIT 10;

-- 5. Check if there are any auth.users
SELECT
  'Auth Users Count' as check_type,
  COUNT(*) as total_users
FROM auth.users;

-- 6. Sample valid users (for testing)
SELECT
  'Sample Valid Users' as check_type,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- ===== DIAGNOSTIC QUERIES =====

-- 7. Check if the problematic order exists and its details
-- Uncomment and replace ORDER_ID with the actual order that caused the error
-- SELECT
--   o.id,
--   o.user_id,
--   o.status,
--   o.created_at,
--   EXISTS (SELECT 1 FROM auth.users WHERE id = o.user_id) as user_exists_in_auth,
--   cs.user_id as submission_user_id,
--   EXISTS (SELECT 1 FROM auth.users WHERE id = cs.user_id) as submission_user_exists
-- FROM public.orders o
-- LEFT JOIN public.checkout_submissions cs ON cs.id = o.checkout_submission_id
-- WHERE o.id = 'PASTE_ORDER_ID_HERE'::uuid;

-- ===== POTENTIAL FIXES =====

-- Fix 1: Update orders with NULL user_id from their checkout_submission
-- (Only run this if diagnostic shows orders have NULL user_id but submission has valid user_id)
-- UPDATE public.orders o
-- SET user_id = cs.user_id
-- FROM public.checkout_submissions cs
-- WHERE o.checkout_submission_id = cs.id
--   AND o.user_id IS NULL
--   AND cs.user_id IS NOT NULL;

-- Fix 2: Delete orders with invalid user_id (DANGEROUS - only if you're sure)
-- DO NOT RUN unless you're absolutely certain these are test orders
-- DELETE FROM public.orders
-- WHERE user_id IS NOT NULL
--   AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = orders.user_id);
