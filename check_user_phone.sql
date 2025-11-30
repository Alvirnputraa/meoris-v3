-- Check order and user data for phone validation issue
SELECT
  o.order_number,
  o.shipping_address,
  o.user_id,
  u.nama,
  u.phone,
  u.shipping_phone,
  u.shipping_street,
  u.shipping_postal_code
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE o.order_number = 'DEV-T44456308106T2URE';

-- Also check user_addresses
SELECT
  ua.*
FROM orders o
LEFT JOIN user_addresses ua ON o.user_id = ua.user_id
WHERE o.order_number = 'DEV-T44456308106T2URE';
