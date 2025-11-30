-- Add approved_at column to returns table
ALTER TABLE public.returns
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_returns_approved_at ON public.returns(approved_at);

-- Create function to auto-set approved_at when status changes to 'approved'
CREATE OR REPLACE FUNCTION set_approved_at_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status is being changed to 'approved' and approved_at is null
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.approved_at IS NULL THEN
    NEW.approved_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_set_approved_at ON public.returns;

-- Create trigger
CREATE TRIGGER trg_set_approved_at
BEFORE UPDATE ON public.returns
FOR EACH ROW
EXECUTE FUNCTION set_approved_at_on_status_change();

COMMENT ON COLUMN public.returns.approved_at IS 'Timestamp when return request was approved. Used for 2-day deadline calculation.';
