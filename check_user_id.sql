-- Check apakah user_id ada di auth.users
SELECT
  'Check user in auth.users' as info,
  id,
  email,
  created_at
FROM auth.users
WHERE id = 'b41ef1ca-f2fb-47df-a4d7-b44fb2c22af3';

-- Check user_id dari order
SELECT
  'User ID from orders table' as info,
  o.user_id,
  o.order_number,
  o.status,
  o.created_at
FROM orders o
WHERE o.id = 'f23a3880-a10a-4dc8-baa4-81fe5d9e0ddb';

-- Check semua PAID orders dengan voucher dan verify user_id exists
SELECT
  'PAID orders with valid users' as info,
  o.id as order_id,
  o.user_id,
  o.order_number,
  o.voucher_code,
  o.status,
  CASE
    WHEN EXISTS (SELECT 1 FROM auth.users u WHERE u.id = o.user_id) THEN 'Valid User'
    ELSE 'USER NOT FOUND IN auth.users'
  END as user_status,
  o.created_at
FROM orders o
WHERE o.status = 'paid'
  AND o.voucher_code IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 10;
