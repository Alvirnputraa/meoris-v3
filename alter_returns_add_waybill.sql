-- =============================================
-- ALTER: returns table - add return_waybill column
-- =============================================

-- Add column for storing JNT return waybill/resi
ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS return_waybill TEXT;

-- Add index for faster queries by waybill
CREATE INDEX IF NOT EXISTS idx_returns_waybill ON public.returns(return_waybill);

-- Add comment
COMMENT ON COLUMN public.returns.return_waybill IS 'JNT waybill number for return shipment (auto-generated via Biteship)';
