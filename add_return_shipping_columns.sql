-- Add columns for return shipping arrangement
ALTER TABLE returns
ADD COLUMN IF NOT EXISTS return_shipping_method TEXT,
ADD COLUMN IF NOT EXISTS return_shipping_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS dropoff_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shipping_arranged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS arranged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS return_courier TEXT,
ADD COLUMN IF NOT EXISTS return_courier_service TEXT;

-- Add comments for documentation
COMMENT ON COLUMN returns.return_shipping_method IS 'Metode pengiriman return: dropoff atau pickup';
COMMENT ON COLUMN returns.return_shipping_scheduled_at IS 'Jadwal pickup untuk return (jika metode pickup)';
COMMENT ON COLUMN returns.dropoff_deadline IS 'Deadline dropoff (2 hari dari arranged_at jika metode dropoff)';
COMMENT ON COLUMN returns.shipping_arranged IS 'Apakah user sudah mengatur pengiriman return';
COMMENT ON COLUMN returns.arranged_at IS 'Timestamp ketika user mengatur pengiriman return';
COMMENT ON COLUMN returns.return_courier IS 'Courier code untuk return (e.g., jnt, jne, sicepat)';
COMMENT ON COLUMN returns.return_courier_service IS 'Service name dari courier untuk return (e.g., J&T Express - EZ)';
