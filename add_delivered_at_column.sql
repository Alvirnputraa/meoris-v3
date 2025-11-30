-- Add delivered_at column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Create index for better performance on automated queries
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at
ON orders(delivered_at)
WHERE shipping_status = 'delivered';

-- Add comment
COMMENT ON COLUMN orders.delivered_at IS 'Timestamp when order status changed to delivered. Used to auto-complete after 2 days.';
