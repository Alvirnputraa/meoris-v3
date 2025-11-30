-- Fix flash_sale_config RLS to allow public read access

-- Enable RLS (if not already enabled)
ALTER TABLE flash_sale_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Allow public read access to flash_sale_config" ON flash_sale_config;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access to flash_sale_config"
ON flash_sale_config
FOR SELECT
TO public
USING (true);
