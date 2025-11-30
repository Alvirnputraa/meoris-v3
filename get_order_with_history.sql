-- Ambil order_number dari order yang punya shipping history
SELECT
  o.order_number,
  o.id,
  o.user_id,
  COUNT(sh.id) as total_history
FROM orders o
INNER JOIN shipping_history sh ON sh.order_id = o.id
WHERE o.id = '3655dd39-b7a1-44c9-913c-896499c34d15'
GROUP BY o.id, o.order_number, o.user_id;
