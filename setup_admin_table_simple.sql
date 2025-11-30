-- ============================================
-- Setup Admin Users Table - SIMPLE VERSION
-- ============================================
-- Jalankan SQL ini di Supabase SQL Editor

-- Create table (jika belum ada)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view their own data" ON public.admin_users;
DROP POLICY IF EXISTS "Admin can update their own data" ON public.admin_users;
DROP POLICY IF EXISTS "Allow service role full access" ON public.admin_users;

-- Policy: Admin dapat melihat data mereka sendiri
CREATE POLICY "Admin can view their own data"
  ON public.admin_users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Admin dapat update data mereka sendiri
CREATE POLICY "Admin can update their own data"
  ON public.admin_users
  FOR UPDATE
  USING (auth.uid() = id);

-- Grant permissions ke service_role (untuk API)
GRANT ALL ON public.admin_users TO service_role;

-- Grant permissions ke authenticated (untuk user biasa)
GRANT SELECT, UPDATE ON public.admin_users TO authenticated;

-- Verifikasi
SELECT
  'Tabel admin_users siap digunakan!' as status,
  'Sekarang bisa register di /admin/register' as info;
