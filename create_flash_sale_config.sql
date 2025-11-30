-- Create flash_sale_config table
CREATE TABLE IF NOT EXISTS flash_sale_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE flash_sale_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access to flash_sale_config"
ON flash_sale_config
FOR SELECT
TO public
USING (true);

-- Insert default flash sale config (24 hours from now)
INSERT INTO flash_sale_config (start_time, end_time, is_active)
VALUES (
  NOW(),
  NOW() + INTERVAL '24 hours',
  true
)
ON CONFLICT DO NOTHING;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_flash_sale_config_active ON flash_sale_config(is_active);
CREATE INDEX IF NOT EXISTS idx_flash_sale_config_end_time ON flash_sale_config(end_time);
