-- Fix foreign key constraint untuk used_vouchers
-- Masalah: user_id references auth.users tapi user mungkin tidak ada di auth.users

-- ========================================
-- OPTION 1: Drop foreign key constraint (RECOMMENDED)
-- ========================================
-- Ini lebih aman karena kadang user_id di orders tidak match dengan auth.users
-- (misal: guest checkout, user deleted, dll)

-- Drop constraint
ALTER TABLE used_vouchers
DROP CONSTRAINT IF EXISTS used_vouchers_user_id_fkey;

-- Tambah index untuk performance (tetap butuh index walau tanpa FK)
CREATE INDEX IF NOT EXISTS idx_used_vouchers_user_id ON used_vouchers(user_id);

-- Verify constraint sudah dihapus
SELECT
  'Verification: Foreign Keys' as info,
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table
FROM pg_constraint
WHERE conrelid = 'used_vouchers'::regclass
  AND contype = 'f';

-- Expected: Should return empty (no foreign key constraints)

-- ========================================
-- OPTION 2: Keep FK but make it more lenient (ALTERNATIVE)
-- ========================================
-- Uncomment jika Anda ingin tetap ada FK validation

/*
-- Drop old constraint
ALTER TABLE used_vouchers
DROP CONSTRAINT IF EXISTS used_vouchers_user_id_fkey;

-- Add new constraint dengan ON DELETE SET NULL
-- Ini akan set user_id = NULL jika user dihapus dari auth.users
ALTER TABLE used_vouchers
ADD CONSTRAINT used_vouchers_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Tapi ini butuh kolom user_id jadi nullable:
ALTER TABLE used_vouchers
ALTER COLUMN user_id DROP NOT NULL;
*/

-- ========================================
-- After fixing, try insert again
-- ========================================
COMMENT ON TABLE used_vouchers IS 'Tracks vouchers that have been used (FK to auth.users removed for flexibility)';
