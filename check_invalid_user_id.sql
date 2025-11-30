-- ===== CHECK INVALID USER_ID ISSUE =====

-- 1. Check the order's user_id
SELECT
  'Order user_id' as check,
  o.id as order_id,
  o.user_id,
  o.status,
  o.created_at,
  o.checkout_submission_id
FROM public.orders o
WHERE o.id = '00d8eb18-280b-4ddf-9915-26dd0f05fac3';

-- 2. Check if this user_id exists in auth.users
SELECT
  'User in auth.users?' as check,
  id,
  email,
  created_at
FROM auth.users
WHERE id = 'aa69bd53-8569-4114-8387-3c1a531cec94';

-- If above returns 0 rows, user does NOT exist!

-- 3. Check all users in auth.users (to see valid users)
SELECT
  'Valid Users in auth.users' as check,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check checkout_submission for this order
SELECT
  'Checkout Submission' as check,
  cs.id,
  cs.user_id as submission_user_id,
  cs.status,
  cs.created_at,
  EXISTS (SELECT 1 FROM auth.users WHERE id = cs.user_id) as user_exists_in_auth
FROM public.checkout_submissions cs
WHERE cs.id = (
  SELECT checkout_submission_id
  FROM public.orders
  WHERE id = '00d8eb18-280b-4ddf-9915-26dd0f05fac3'
);

-- 5. Check if user_id from order matches a different user
SELECT
  'Possible User Match' as check,
  u.id,
  u.email,
  u.created_at,
  'Does this match your logged in user?' as question
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 3;
