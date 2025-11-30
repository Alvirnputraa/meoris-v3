-- =====================================================
-- ADD SHORT_ID TO PRA_CHECKOUT TABLE
-- =====================================================
-- Purpose: Menambahkan kolom short_id untuk URL checkout yang lebih aman
--          dan profesional, menggantikan full UUID di URL
-- =====================================================

-- Step 1: Add short_id column (nullable first)
ALTER TABLE pra_checkout
ADD COLUMN IF NOT EXISTS short_id VARCHAR(20) UNIQUE;

-- Step 2: Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_pra_checkout_short_id
ON pra_checkout(short_id);

-- Step 3: Create function to generate unique short ID
CREATE OR REPLACE FUNCTION generate_checkout_short_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars: 0,O,1,I
  result TEXT := 'CHKT-';
  i INTEGER;
  random_char TEXT;
BEGIN
  -- Generate 8 random characters (CHKT-XXXXYYYY format)
  FOR i IN 1..4 LOOP
    random_char := substr(chars, floor(random() * length(chars) + 1)::int, 1);
    result := result || random_char;
  END LOOP;

  result := result || '-';

  FOR i IN 1..4 LOOP
    random_char := substr(chars, floor(random() * length(chars) + 1)::int, 1);
    result := result || random_char;
  END LOOP;

  RETURN result;
END;
$$;

-- Step 4: Create function to ensure unique short_id
CREATE OR REPLACE FUNCTION get_unique_checkout_short_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    new_id := generate_checkout_short_id();

    -- Check if this ID already exists
    SELECT EXISTS(SELECT 1 FROM pra_checkout WHERE short_id = new_id) INTO id_exists;

    -- If doesn't exist, return it
    IF NOT id_exists THEN
      RETURN new_id;
    END IF;

    -- Otherwise loop and try again
  END LOOP;
END;
$$;

-- Step 5: Update existing records with short_id
-- This will generate unique short IDs for all existing pra_checkout records
DO $$
DECLARE
  rec RECORD;
  new_short_id TEXT;
BEGIN
  FOR rec IN SELECT id FROM pra_checkout WHERE short_id IS NULL
  LOOP
    new_short_id := get_unique_checkout_short_id();
    UPDATE pra_checkout
    SET short_id = new_short_id
    WHERE id = rec.id;
  END LOOP;
END $$;

-- Step 6: Create trigger to auto-generate short_id for new records
CREATE OR REPLACE FUNCTION trigger_set_checkout_short_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := get_unique_checkout_short_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS set_checkout_short_id ON pra_checkout;
CREATE TRIGGER set_checkout_short_id
  BEFORE INSERT ON pra_checkout
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_checkout_short_id();

-- Step 7: Make short_id NOT NULL (after all existing records have been updated)
ALTER TABLE pra_checkout
ALTER COLUMN short_id SET NOT NULL;

-- Verify the changes
SELECT
  'Verification:' as status,
  COUNT(*) as total_records,
  COUNT(short_id) as records_with_short_id,
  COUNT(DISTINCT short_id) as unique_short_ids
FROM pra_checkout;

-- Show some examples
SELECT
  id as uuid,
  short_id,
  created_at
FROM pra_checkout
ORDER BY created_at DESC
LIMIT 5;
