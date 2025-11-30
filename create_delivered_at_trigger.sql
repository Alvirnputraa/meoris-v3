-- Trigger function to set delivered_at when status changes to delivered
CREATE OR REPLACE FUNCTION set_delivered_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status changed to 'delivered' and delivered_at is not set
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at = NOW();
  END IF;

  -- If status changed from 'delivered' to something else, clear delivered_at
  IF NEW.status != 'delivered' AND OLD.status = 'delivered' THEN
    NEW.delivered_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_set_delivered_at ON orders;

-- Create trigger
CREATE TRIGGER trigger_set_delivered_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_delivered_at();

COMMENT ON FUNCTION set_delivered_at() IS 'Automatically sets delivered_at timestamp when order status changes to delivered';
