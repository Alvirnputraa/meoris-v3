-- =============================================
-- CREATE: replacement_items table
-- =============================================
-- This table stores the replacement products that admin will send to user
-- after validating the returned product

CREATE TABLE IF NOT EXISTS public.replacement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_replacement_items_return_id ON public.replacement_items(return_id);

-- Add comment
COMMENT ON TABLE public.replacement_items IS 'Stores replacement product items that will be sent to customer after validation approved';
COMMENT ON COLUMN public.replacement_items.return_id IS 'Reference to the return request';
COMMENT ON COLUMN public.replacement_items.product_name IS 'Name of replacement product (manually entered by admin)';
COMMENT ON COLUMN public.replacement_items.product_size IS 'Size of replacement product';
COMMENT ON COLUMN public.replacement_items.quantity IS 'Quantity of replacement product';

-- Enable RLS
ALTER TABLE public.replacement_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin can do everything
CREATE POLICY "Admin can manage all replacement items"
ON public.replacement_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  )
);

-- Users can only view their own replacement items
CREATE POLICY "Users can view their own replacement items"
ON public.replacement_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.returns
    WHERE returns.id = replacement_items.return_id
    AND returns.user_id = auth.uid()
  )
);

-- =============================================
-- ALTER: returns table - add replacement shipping columns
-- =============================================

-- Add columns for replacement shipment tracking
ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS replacement_courier TEXT,
  ADD COLUMN IF NOT EXISTS replacement_courier_service TEXT,
  ADD COLUMN IF NOT EXISTS replacement_waybill TEXT,
  ADD COLUMN IF NOT EXISTS replacement_shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validation_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validation_notes TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_returns_replacement_waybill ON public.returns(replacement_waybill);
CREATE INDEX IF NOT EXISTS idx_returns_validation_completed_at ON public.returns(validation_completed_at);

-- Add comments
COMMENT ON COLUMN public.returns.replacement_courier IS 'Courier for sending replacement product (sicepat, jnt, jne)';
COMMENT ON COLUMN public.returns.replacement_courier_service IS 'Service name for replacement shipment';
COMMENT ON COLUMN public.returns.replacement_waybill IS 'Waybill/resi number for replacement shipment';
COMMENT ON COLUMN public.returns.replacement_shipped_at IS 'Timestamp when replacement was shipped';
COMMENT ON COLUMN public.returns.validation_completed_at IS 'Timestamp when validation was completed (approved/rejected)';
COMMENT ON COLUMN public.returns.validation_notes IS 'Admin notes during validation process';

-- =============================================
-- CREATE: return_replacement_history table
-- =============================================
-- Track replacement shipping history (similar to shipping_history for orders)

CREATE TABLE IF NOT EXISTS public.return_replacement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  waybill TEXT NOT NULL,
  courier TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_return_replacement_history_return_id ON public.return_replacement_history(return_id);
CREATE INDEX IF NOT EXISTS idx_return_replacement_history_waybill ON public.return_replacement_history(waybill);

-- Add comment
COMMENT ON TABLE public.return_replacement_history IS 'Tracks shipping status history for replacement products';

-- Enable RLS
ALTER TABLE public.return_replacement_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin can do everything
CREATE POLICY "Admin can manage all replacement history"
ON public.return_replacement_history
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  )
);

-- Users can view their own replacement history
CREATE POLICY "Users can view their own replacement history"
ON public.return_replacement_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.returns
    WHERE returns.id = return_replacement_history.return_id
    AND returns.user_id = auth.uid()
  )
);

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'Replacement system tables created successfully!' AS message;
