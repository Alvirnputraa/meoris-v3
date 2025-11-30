-- Create return_shipping_history table for tracking return shipments
CREATE TABLE IF NOT EXISTS return_shipping_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES returns(id) ON DELETE CASCADE,
  biteship_order_id TEXT,
  courier_tracking_id TEXT,
  courier_waybill_id TEXT,
  courier_company TEXT,
  courier_type TEXT,
  courier_driver_name TEXT,
  courier_driver_phone TEXT,
  courier_driver_plate_number TEXT,
  courier_link TEXT,
  biteship_status TEXT,
  status_display TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_return_shipping_history_return_id ON return_shipping_history(return_id);
CREATE INDEX IF NOT EXISTS idx_return_shipping_history_biteship_order_id ON return_shipping_history(biteship_order_id);
CREATE INDEX IF NOT EXISTS idx_return_shipping_history_courier_waybill_id ON return_shipping_history(courier_waybill_id);

-- Enable RLS
ALTER TABLE return_shipping_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only see their own return shipping history
CREATE POLICY "Users can view their own return shipping history"
  ON return_shipping_history
  FOR SELECT
  USING (
    return_id IN (
      SELECT r.id FROM returns r
      JOIN orders o ON r.order_id = o.id
      WHERE o.user_id = auth.uid()
    )
  );

-- Allow service role to insert/update (for webhook)
CREATE POLICY "Service role can manage return shipping history"
  ON return_shipping_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE return_shipping_history IS 'Stores shipping tracking history for return shipments from Biteship webhooks';
