-- Add column to track if order has been updated
-- This prevents multiple updates to the same order

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS has_been_updated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the column
COMMENT ON COLUMN public.orders.has_been_updated IS 'Indicates if order details (size) have been updated by user. Can only be updated once.';
COMMENT ON COLUMN public.orders.updated_at IS 'Timestamp when order was last updated by user';
