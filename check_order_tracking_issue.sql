-- Check order DEV-T44456306531CZAIK
SELECT
  id,
  order_number,
  user_id,
  shipping_resi,
  shipping_status,
  created_at,
  updated_at
FROM orders
WHERE order_number = 'DEV-T44456306531CZAIK';

-- Check shipping history for this order
-- Ganti ORDER_ID dengan hasil query di atas
SELECT
  id,
  order_id,
  event_type,
  biteship_status,
  status_display,
  courier_name,
  created_at
FROM shipping_history
WHERE order_id = (
  SELECT id FROM orders WHERE order_number = 'DEV-T44456306531CZAIK'
)
ORDER BY created_at DESC;

-- Check if user owns this order
SELECT
  o.order_number,
  o.user_id,
  u.email
FROM orders o
LEFT JOIN users u ON u.id = o.user_id
WHERE o.order_number = 'DEV-T44456306531CZAIK';
