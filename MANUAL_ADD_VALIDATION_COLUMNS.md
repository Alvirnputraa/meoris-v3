# Manual Migration: Add Validation Columns

## Cara 1: Via Supabase Dashboard

1. Buka Supabase Dashboard: https://supabase.com/dashboard
2. Pilih project Anda
3. Klik "SQL Editor" di sidebar
4. Paste SQL berikut:

```sql
-- Add validation columns to returns table
ALTER TABLE public.returns
ADD COLUMN IF NOT EXISTS status_validasi TEXT;

ALTER TABLE public.returns
ADD COLUMN IF NOT EXISTS validasi TEXT CHECK (validasi IN ('approved', 'rejected', NULL));

-- Create index
CREATE INDEX IF NOT EXISTS idx_returns_validasi ON public.returns(validasi);

-- Add comments
COMMENT ON COLUMN public.returns.status_validasi IS 'Current validation status description';
COMMENT ON COLUMN public.returns.validasi IS 'Validation result: approved or rejected';
```

5. Klik "Run" atau tekan Ctrl+Enter

## Cara 2: Via SQL File

Jalankan file: `add_validation_columns_to_returns.sql` di Supabase SQL Editor

## Verifikasi

Jalankan query berikut untuk memastikan kolom sudah ditambahkan:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'returns'
AND column_name IN ('status_validasi', 'validasi');
```

Expected output:
```
column_name      | data_type
-----------------+-----------
status_validasi  | text
validasi         | text
```

## Usage Examples

```sql
-- Set validation status
UPDATE returns
SET status_validasi = 'Sedang memeriksa kondisi produk'
WHERE id = 'xxx';

-- Approve validation
UPDATE returns
SET validasi = 'approved',
    status_validasi = 'Validasi selesai - produk sesuai',
    status = 'completed'
WHERE id = 'xxx';

-- Reject validation
UPDATE returns
SET validasi = 'rejected',
    status_validasi = 'Validasi ditolak - produk tidak sesuai kondisi'
WHERE id = 'xxx';
```
