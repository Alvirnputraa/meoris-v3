-- Add is_default column to user_addresses table

-- Add is_default column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_addresses'
        AND column_name = 'is_default'
    ) THEN
        ALTER TABLE public.user_addresses ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN public.user_addresses.is_default IS 'Is this the default address for the user';
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_addresses_default ON public.user_addresses(user_id, is_default) WHERE is_default = TRUE;

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        -- Set all other addresses for this user to non-default
        UPDATE public.user_addresses
        SET is_default = FALSE
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_ensure_single_default_address ON public.user_addresses;
CREATE TRIGGER trigger_ensure_single_default_address
    BEFORE INSERT OR UPDATE ON public.user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_address();

-- Note: Run this in Supabase SQL Editor
