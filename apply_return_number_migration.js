const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🚀 Starting return_number migration...\n');

  try {
    // Step 1: Add return_number column
    console.log('📝 Step 1: Adding return_number column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE returns
        ADD COLUMN IF NOT EXISTS return_number TEXT UNIQUE;
      `
    });

    if (alterError) {
      console.log('⚠️  Using alternative method to add column...');
      // Alternative: Try using Supabase client (might need direct SQL access)
      console.log('ℹ️  Please run this SQL manually in Supabase SQL Editor:');
      console.log('----------------------------------------');
      console.log('ALTER TABLE returns');
      console.log('ADD COLUMN IF NOT EXISTS return_number TEXT UNIQUE;');
      console.log('----------------------------------------\n');
    } else {
      console.log('✅ Column added successfully\n');
    }

    // Step 2: Create index
    console.log('📝 Step 2: Creating index...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_returns_return_number ON returns(return_number);
      `
    });

    if (indexError) {
      console.log('ℹ️  Please run this SQL manually in Supabase SQL Editor:');
      console.log('----------------------------------------');
      console.log('CREATE INDEX IF NOT EXISTS idx_returns_return_number ON returns(return_number);');
      console.log('----------------------------------------\n');
    } else {
      console.log('✅ Index created successfully\n');
    }

    console.log('\n⚠️  IMPORTANT: The following SQL commands need to be run manually in Supabase SQL Editor:\n');
    console.log('========================================');
    console.log(`
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

-- 5. Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_return_number ON returns;

CREATE TRIGGER trigger_set_return_number
  BEFORE INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION set_return_number();

-- 6. Update existing returns with return numbers
UPDATE returns
SET return_number = generate_return_number()
WHERE return_number IS NULL;

-- 7. Verify the changes
SELECT
  id,
  order_id,
  return_number,
  status,
  created_at
FROM returns
ORDER BY created_at DESC
LIMIT 5;
    `);
    console.log('========================================\n');

    console.log('📋 INSTRUCTIONS:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy the SQL commands above');
    console.log('4. Paste and click RUN');
    console.log('5. Wait for success message');
    console.log('6. Restart your development server: npm run dev\n');

    console.log('✨ Migration preparation complete!');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    console.log('\nℹ️  Please apply the SQL script manually using Supabase SQL Editor.');
  }
}

applyMigration();
