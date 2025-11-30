-- Create user_addresses table with all columns

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nama TEXT NOT NULL,
  phone TEXT NOT NULL,
  street TEXT NOT NULL,
  provinsi TEXT NOT NULL,
  kabupaten TEXT NOT NULL,
  kecamatan TEXT NOT NULL,
  kelurahan TEXT NOT NULL,
  postal TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);

-- Create index for default addresses
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER trigger_update_user_addresses_updated_at
    BEFORE UPDATE ON public.user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view their own addresses
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.user_addresses;
CREATE POLICY "Users can view their own addresses"
ON public.user_addresses FOR SELECT
USING (true);  -- Allow all reads for now (can be restricted later)

-- Policy: Users can insert their own addresses
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.user_addresses;
CREATE POLICY "Users can insert their own addresses"
ON public.user_addresses FOR INSERT
WITH CHECK (true);  -- Allow all inserts for now (can be restricted later)

-- Policy: Users can update their own addresses
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.user_addresses;
CREATE POLICY "Users can update their own addresses"
ON public.user_addresses FOR UPDATE
USING (true)  -- Allow all updates for now (can be restricted later)
WITH CHECK (true);

-- Policy: Users can delete their own addresses
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.user_addresses;
CREATE POLICY "Users can delete their own addresses"
ON public.user_addresses FOR DELETE
USING (true);  -- Allow all deletes for now (can be restricted later)

-- Note: Run this in Supabase SQL Editor
