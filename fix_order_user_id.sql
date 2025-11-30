-- ===== FIX ORDER WITH INVALID USER_ID =====

-- Option 1: Get a valid user_id from auth.users
SELECT
  'Valid Users' as step,
  id as valid_user_id,
  email
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Option 2: Update order to use a valid user_id
-- UNCOMMENT and replace VALID_USER_ID with actual user_id from above query
/*
UPDATE public.orders
SET user_id = 'PASTE_VALID_USER_ID_HERE'::uuid
WHERE id = '00d8eb18-280b-4ddf-9915-26dd0f05fac3';
*/

-- Option 3: Create notification manually with valid user_id
-- UNCOMMENT and replace VALID_USER_ID
/*
INSERT INTO public.notifications (user_id, order_id, type, title, message)
VALUES (
  'PASTE_VALID_USER_ID_HERE'::uuid,
  '00d8eb18-280b-4ddf-9915-26dd0f05fac3'::uuid,
  'payment_success',
  'Pembayaran Berhasil',
  'Pembayaran berhasil. Pesananmu sekarang sedang dikemas'
);
*/

-- After fixing, verify:
SELECT
  'Verification' as step,
  o.id as order_id,
  o.user_id,
  u.email as user_email,
  EXISTS (SELECT 1 FROM auth.users WHERE id = o.user_id) as user_valid
FROM public.orders o
LEFT JOIN auth.users u ON u.id = o.user_id
WHERE o.id = '00d8eb18-280b-4ddf-9915-26dd0f05fac3';
