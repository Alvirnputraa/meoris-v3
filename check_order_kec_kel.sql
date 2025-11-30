-- Check order shipping address data
SELECT
  id,
  order_number,
  shipping_address_json,
  checkout_submission_id,
  created_at
FROM orders
WHERE order_number = 'DEV-T444563065427YKK8';

-- Check the related checkout submission
SELECT
  id,
  shipping_address
FROM checkout_submissions
WHERE id = (
  SELECT checkout_submission_id
  FROM orders
  WHERE order_number = 'DEV-T444563065427YKK8'
);
