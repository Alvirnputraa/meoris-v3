-- ============================================
-- QUICK SETUP ADMIN LOGIN
-- ============================================
-- Script ini akan setup semua yang diperlukan untuk admin login
-- Jalankan script ini SETELAH membuat user di Supabase Auth Dashboard

-- STEP 1: Create admin_users table
DROP TABLE IF EXISTS public.admin_users CASCADE;

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

-- Add indexes
CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_admin_users_is_active ON public.admin_users(is_active);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin can view their own data"
  ON public.admin_users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin can update their own data"
  ON public.admin_users
  FOR UPDATE
  USING (auth.uid() = id);

-- Grant permissions
GRANT SELECT, UPDATE ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

-- STEP 2: Insert admin data
-- CATATAN: Pastikan Anda sudah membuat user dengan email admin@erdanpee.com
--          di Supabase Auth Dashboard dengan password 123456

INSERT INTO public.admin_users (id, email, nama, role, is_active)
SELECT
  id,
  email,
  'Admin Erdanpee',
  'super_admin',
  TRUE
FROM auth.users
WHERE email = 'admin@erdanpee.com'
ON CONFLICT (id) DO NOTHING;

-- STEP 3: Verify setup
-- Query untuk mengecek apakah admin berhasil dibuat
SELECT
  au.id,
  au.email,
  au.nama,
  au.role,
  au.is_active,
  au.created_at,
  u.email as auth_email,
  CASE
    WHEN u.id IS NOT NULL THEN 'User exists in auth'
    ELSE 'User NOT FOUND in auth - Please create user in Supabase Dashboard first!'
  END as status
FROM public.admin_users au
LEFT JOIN auth.users u ON u.id = au.id
WHERE au.email = 'admin@erdanpee.com';

-- Success message
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM public.admin_users
  WHERE email = 'admin@erdanpee.com';

  IF admin_count > 0 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SETUP BERHASIL!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Admin user berhasil dibuat:';
    RAISE NOTICE 'Email: admin@erdanpee.com';
    RAISE NOTICE 'Password: 123456';
    RAISE NOTICE '';
    RAISE NOTICE 'Anda sekarang bisa login di:';
    RAISE NOTICE 'http://localhost:3000/admin/login';
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING '========================================';
    RAISE WARNING '⚠️ SETUP GAGAL!';
    RAISE WARNING '========================================';
    RAISE WARNING 'Admin user tidak ditemukan.';
    RAISE WARNING 'Pastikan Anda sudah membuat user dengan email:';
    RAISE WARNING 'admin@erdanpee.com';
    RAISE WARNING 'di Supabase Dashboard > Authentication > Users';
    RAISE WARNING '========================================';
  END IF;
END $$;
