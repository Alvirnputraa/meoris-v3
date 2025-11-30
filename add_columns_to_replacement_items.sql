-- =====================================================
-- ADD COLUMNS TO replacement_items TABLE
-- =====================================================
-- Add product_id, product_photo, product_price columns
-- to store complete product information
-- =====================================================

-- Add product_id column (UUID reference to produk table)
ALTER TABLE replacement_items
ADD COLUMN IF NOT EXISTS product_id UUID;

-- Add product_photo column (TEXT for photo URL/path)
ALTER TABLE replacement_items
ADD COLUMN IF NOT EXISTS product_photo TEXT;

-- Add product_price column (INTEGER for price in IDR)
ALTER TABLE replacement_items
ADD COLUMN IF NOT EXISTS product_price INTEGER;

-- Add foreign key constraint to produk table (optional, for data integrity)
-- Uncomment if you want to enforce referential integrity
-- ALTER TABLE replacement_items
-- ADD CONSTRAINT fk_replacement_items_product
-- FOREIGN KEY (product_id) REFERENCES produk(id) ON DELETE SET NULL;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'replacement_items'
ORDER BY ordinal_position;
