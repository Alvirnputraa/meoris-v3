-- Add shipping address fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS shipping_nama VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS shipping_street TEXT,
  ADD COLUMN IF NOT EXISTS shipping_kabupaten VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_kecamatan VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_provinsi VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_kelurahan VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS shipping_negara VARCHAR(100) DEFAULT 'Indonesia',
  ADD COLUMN IF NOT EXISTS shipping_provinsi_id VARCHAR(32),
  ADD COLUMN IF NOT EXISTS shipping_kabupaten_id VARCHAR(32),
  ADD COLUMN IF NOT EXISTS shipping_kecamatan_id VARCHAR(32),
  ADD COLUMN IF NOT EXISTS shipping_kelurahan_id VARCHAR(32),
  ADD COLUMN IF NOT EXISTS shipping_address_json JSONB;

-- Optional indexes for lookup (lightweight; comment out if not needed)
-- CREATE INDEX IF NOT EXISTS idx_users_shipping_kecamatan ON users(shipping_kecamatan);
-- CREATE INDEX IF NOT EXISTS idx_users_shipping_provinsi ON users(shipping_provinsi);
