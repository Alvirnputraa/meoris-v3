-- =====================================================
-- ADD RETURN NUMBER TO RETURNS TABLE
-- =====================================================
-- This will add a unique return_number column and auto-generate it
-- =====================================================

-- 1. Add return_number column
ALTER TABLE returns
ADD COLUMN IF NOT EXISTS return_number TEXT UNIQUE;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_returns_return_number ON returns(return_number);

-- 3. Create function to generate return number
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_timestamp TEXT;
  v_random TEXT;
  v_return_number TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate timestamp part (YYMMDDHHMMSS format)
    v_timestamp := TO_CHAR(NOW(), 'YYMMDDHH24MISS');

    -- Generate random 4-digit number
    v_random := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- Combine into return number format: RET-YYMMDDHHMMSSRRRR
    v_return_number := 'RET-' || v_timestamp || v_random;

    -- Check if this number already exists
    SELECT EXISTS(SELECT 1 FROM returns WHERE return_number = v_return_number) INTO v_exists;

    -- If doesn't exist, return it
    IF NOT v_exists THEN
      RETURN v_return_number;
    END IF;

    -- Otherwise, loop again to generate new number
  END LOOP;
END;
$$;

-- 4. Create trigger to auto-generate return_number on insert
CREATE OR REPLACE FUNCTION set_return_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set return_number if it's NULL
  IF NEW.return_number IS NULL THEN
    NEW.return_number := generate_return_number();
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_return_number ON returns;

CREATE TRIGGER trigger_set_return_number
  BEFORE INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION set_return_number();

-- 5. Update existing returns with return numbers
UPDATE returns
SET return_number = generate_return_number()
WHERE return_number IS NULL;

-- 6. Verify the changes
SELECT
  id,
  order_id,
  return_number,
  status,
  created_at
FROM returns
ORDER BY created_at DESC
LIMIT 5;
