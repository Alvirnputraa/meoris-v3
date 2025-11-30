-- Add phone and gender columns to users table if they don't exist

-- Add phone column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
        COMMENT ON COLUMN public.users.phone IS 'User phone number';
    END IF;
END $$;

-- Add gender column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'gender'
    ) THEN
        ALTER TABLE public.users ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other', NULL));
        COMMENT ON COLUMN public.users.gender IS 'User gender: male, female, or other';
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- Note: Run this in Supabase SQL Editor
