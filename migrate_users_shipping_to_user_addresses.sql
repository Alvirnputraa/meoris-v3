-- Migrate existing shipping data from users table to user_addresses table
-- This will copy data for users who have shipping info but no entry in user_addresses

INSERT INTO user_addresses (
  user_id,
  nama,
  phone,
  street,
  provinsi,
  kabupaten,
  kecamatan,
  kelurahan,
  postal,
  is_default,
  created_at,
  updated_at
)
SELECT
  u.id as user_id,
  COALESCE(u.shipping_nama, '') as nama,
  COALESCE(u.shipping_phone, '') as phone,
  COALESCE(u.shipping_street, '') as street,
  COALESCE(u.shipping_provinsi, '') as provinsi,
  COALESCE(u.shipping_kabupaten, u.shipping_kecamatan, '') as kabupaten,
  COALESCE(u.shipping_kecamatan, '') as kecamatan,
  COALESCE(u.shipping_kelurahan, '') as kelurahan,
  COALESCE(u.shipping_postal_code, '') as postal,
  true as is_default, -- Set as default since it's their primary address
  NOW() as created_at,
  NOW() as updated_at
FROM users u
WHERE
  -- Only migrate users who have at least some shipping data
  (
    u.shipping_nama IS NOT NULL AND u.shipping_nama != ''
    OR u.shipping_phone IS NOT NULL AND u.shipping_phone != ''
    OR u.shipping_street IS NOT NULL AND u.shipping_street != ''
  )
  -- And don't already have an address in user_addresses
  AND NOT EXISTS (
    SELECT 1
    FROM user_addresses ua
    WHERE ua.user_id = u.id
  );

-- Count migrated records
DO $$
DECLARE
  migrated_count INT;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM user_addresses
  WHERE created_at >= NOW() - INTERVAL '1 minute';

  RAISE NOTICE 'Migrated % user addresses', migrated_count;
END $$;
