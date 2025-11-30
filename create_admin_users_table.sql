-- ============================================
-- Create Admin Users Table
-- ============================================
-- Tabel untuk menyimpan data admin yang terpisah dari users biasa
-- Admin akan login menggunakan Supabase Auth, tapi data tambahan disimpan di sini

-- Drop table jika sudah ada
DROP TABLE IF EXISTS public.admin_users CASCADE;

-- Create admin_users table
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add comments
COMMENT ON TABLE public.admin_users IS 'Tabel untuk menyimpan data admin';
COMMENT ON COLUMN public.admin_users.id IS 'User ID dari auth.users';
COMMENT ON COLUMN public.admin_users.email IS 'Email admin';
COMMENT ON COLUMN public.admin_users.nama IS 'Nama lengkap admin';
COMMENT ON COLUMN public.admin_users.role IS 'Role admin (admin, super_admin, etc)';
COMMENT ON COLUMN public.admin_users.is_active IS 'Status aktif admin';

-- Create index
CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_admin_users_is_active ON public.admin_users(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Admin hanya bisa melihat data mereka sendiri
CREATE POLICY "Admin can view their own data"
  ON public.admin_users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Admin bisa update data mereka sendiri
CREATE POLICY "Admin can update their own data"
  ON public.admin_users
  FOR UPDATE
  USING (auth.uid() = id);

-- Grant permissions
GRANT SELECT, UPDATE ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Tabel admin_users berhasil dibuat!';
END $$;
