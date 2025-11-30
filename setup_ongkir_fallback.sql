-- Setup Ongkir Fallback Table
-- Run this in Supabase SQL Editor

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.ongkir (
  id SERIAL PRIMARY KEY,
  ekspedisi TEXT NOT NULL UNIQUE,
  ongkir INTEGER NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Enable RLS (Row Level Security)
ALTER TABLE public.ongkir ENABLE ROW LEVEL SECURITY;

-- 3. Create policy: Allow public read access (ongkir adalah public data)
DROP POLICY IF EXISTS "Allow public read access to ongkir" ON public.ongkir;
CREATE POLICY "Allow public read access to ongkir"
  ON public.ongkir
  FOR SELECT
  USING (true);

-- 4. Insert default fallback rates (akan digunakan jika Biteship tidak support courier tertentu)
-- NOTE: Harga ini adalah fallback untuk seluruh Indonesia, sesuaikan dengan kebutuhan
INSERT INTO public.ongkir (ekspedisi, ongkir, keterangan) VALUES
  ('J&T Express', 14000, 'Fallback rate untuk J&T Express (estimasi 2-3 hari)'),
  ('JNE', 15000, 'Fallback rate untuk JNE (estimasi 3-5 hari)'),
  ('SiCepat', 13000, 'Fallback rate untuk SiCepat (estimasi 2-4 hari)')
ON CONFLICT (ekspedisi)
DO UPDATE SET
  ongkir = EXCLUDED.ongkir,
  keterangan = EXCLUDED.keterangan,
  updated_at = NOW();

-- 5. Verify data
SELECT * FROM public.ongkir ORDER BY ekspedisi;
