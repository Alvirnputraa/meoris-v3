-- Reset all order updates for testing
-- This will allow orders to be updated again
-- ONLY USE THIS FOR TESTING!

UPDATE public.orders
SET has_been_updated = false,
    updated_at = NULL
WHERE has_been_updated = true;

-- Verify the reset
SELECT order_number, status, has_been_updated, updated_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 10;
