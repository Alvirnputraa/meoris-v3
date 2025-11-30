-- Cek order dengan order_number tertentu
SELECT
  id,
  order_number,
  shipping_resi,
  shipping_status,
  created_at
FROM orders
WHERE order_number = 'DEV-T44456306531CZAIK';

-- Jika order ditemukan, cek shipping history-nya
-- Ganti ORDER_ID_DARI_QUERY_ATAS dengan id yang didapat
SELECT
  created_at,
  event_type,
  biteship_status,
  status_display,
  courier_name
FROM shipping_history
WHERE order_id = 'ORDER_ID_DARI_QUERY_ATAS'
ORDER BY created_at ASC;

-- Atau gabungkan dengan JOIN:
SELECT
  o.order_number,
  o.shipping_resi,
  sh.created_at,
  sh.status_display,
  sh.courier_name
FROM orders o
LEFT JOIN shipping_history sh ON sh.order_id = o.id
WHERE o.order_number = 'DEV-T44456306531CZAIK'
ORDER BY sh.created_at ASC;
