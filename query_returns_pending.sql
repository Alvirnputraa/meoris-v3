-- =============================================
-- Query untuk mendapatkan Return ID yang Pending
-- =============================================

-- 1. Lihat semua return requests yang pending
SELECT 
  id as return_id,
  user_id,
  order_number,
  reason,
  description,
  status,
  created_at,
  return_waybill
FROM returns 
WHERE status = 'pending' 
ORDER BY created_at DESC;

-- 2. Lihat detail lengkap return dengan order info
SELECT 
  r.id as return_id,
  r.order_number,
  r.status,
  r.reason,
  r.return_waybill,
  o.shipping_address,
  o.total_amount,
  u.nama as user_name,
  u.email as user_email,
  u.shipping_phone,
  u.shipping_postal_code
FROM returns r
LEFT JOIN orders o ON r.order_id = o.id
LEFT JOIN users u ON r.user_id = u.id
WHERE r.status = 'pending'
ORDER BY r.created_at DESC;

-- 3. Count pending returns
SELECT COUNT(*) as total_pending_returns
FROM returns 
WHERE status = 'pending';

-- 4. Check specific return by ID
SELECT 
  r.*,
  o.shipping_address,
  u.nama,
  u.email,
  u.shipping_phone,
  u.shipping_postal_code
FROM returns r
LEFT JOIN orders o ON r.order_id = o.id
LEFT JOIN users u ON r.user_id = u.id
WHERE r.id = 'PASTE_RETURN_ID_HERE';

-- 5. Lihat history return yang sudah approved
SELECT 
  id as return_id,
  order_number,
  status,
  return_waybill,
  notes,
  created_at,
  updated_at
FROM returns 
WHERE status = 'approved' 
  AND return_waybill IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
