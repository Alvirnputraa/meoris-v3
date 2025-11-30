-- Add validation columns to returns table
-- status_validasi: Text description of validation status (e.g., "Sedang memeriksa kondisi produk")
-- validasi: Validation result - 'approved' or 'rejected'

-- Add status_validasi column
ALTER TABLE public.returns
ADD COLUMN IF NOT EXISTS status_validasi TEXT;

-- Add validasi column (validation result)
ALTER TABLE public.returns
ADD COLUMN IF NOT EXISTS validasi TEXT CHECK (validasi IN ('approved', 'rejected', NULL));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_returns_validasi ON public.returns(validasi);

-- Add comments
COMMENT ON COLUMN public.returns.status_validasi IS 'Current validation status description (e.g., "Sedang memeriksa kondisi produk", "Validasi selesai - produk sesuai")';
COMMENT ON COLUMN public.returns.validasi IS 'Validation result: approved (lanjut ke pergantian) or rejected (tidak lanjut)';

-- Example usage:
-- UPDATE returns SET status_validasi = 'Sedang memeriksa kondisi produk' WHERE id = '...';
-- UPDATE returns SET validasi = 'approved', status_validasi = 'Validasi selesai - produk sesuai' WHERE id = '...';
-- UPDATE returns SET validasi = 'rejected', status_validasi = 'Validasi ditolak - produk tidak sesuai' WHERE id = '...';
