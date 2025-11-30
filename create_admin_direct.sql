-- ============================================
-- CREATE ADMIN USER DIRECTLY
-- ============================================
-- Script untuk membuat admin user langsung di auth.users dan admin_users
-- Email: admin@erdanpee.com
-- Password: 123456

-- PENTING: Script ini perlu dijalankan dengan privileges yang cukup
-- Biasanya perlu menggunakan service_role key atau postgres role

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================
-- STEP 1: Create admin_users table (jika belum ada)
-- ====================
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

-- Add indexes (jika belum ada)
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin can view their own data" ON public.admin_users;
DROP POLICY IF EXISTS "Admin can update their own data" ON public.admin_users;

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

-- ====================
-- STEP 2: Insert user to auth.users
-- ====================
-- Generate UUID untuk admin user
DO $$
DECLARE
  admin_user_id UUID;
  admin_email TEXT := 'admin@erdanpee.com';
  admin_password TEXT := '123456';
  encrypted_password TEXT;
BEGIN
  -- Check if user already exists
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;

  IF admin_user_id IS NOT NULL THEN
    RAISE NOTICE 'User dengan email % sudah ada dengan ID: %', admin_email, admin_user_id;
  ELSE
    -- Generate new UUID
    admin_user_id := uuid_generate_v4();

    -- Encrypt password menggunakan crypt
    encrypted_password := crypt(admin_password, gen_salt('bf'));

    -- Insert to auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      admin_email,
      encrypted_password,
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Admin Erdanpee"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    RAISE NOTICE '✅ User berhasil dibuat di auth.users dengan ID: %', admin_user_id;
  END IF;

  -- ====================
  -- STEP 3: Insert to admin_users
  -- ====================
  INSERT INTO public.admin_users (id, email, nama, role, is_active)
  VALUES (admin_user_id, admin_email, 'Admin Erdanpee', 'super_admin', TRUE)
  ON CONFLICT (id) DO UPDATE
  SET
    nama = EXCLUDED.nama,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  RAISE NOTICE '✅ Admin data berhasil dibuat di admin_users';

  -- ====================
  -- STEP 4: Create identity record
  -- ====================
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    admin_user_id,
    format('{"sub":"%s","email":"%s"}', admin_user_id, admin_email)::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  ) ON CONFLICT (provider, id) DO NOTHING;

  RAISE NOTICE '✅ Identity record berhasil dibuat';

END $$;

-- ====================
-- VERIFICATION
-- ====================
-- Tampilkan hasil untuk verifikasi
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  au.nama,
  au.role,
  au.is_active,
  'User berhasil dibuat!' as status
FROM auth.users u
LEFT JOIN public.admin_users au ON au.id = u.id
WHERE u.email = 'admin@erdanpee.com';

-- Final message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 SETUP SELESAI!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Admin user berhasil dibuat:';
  RAISE NOTICE '';
  RAISE NOTICE 'Email: admin@erdanpee.com';
  RAISE NOTICE 'Password: 123456';
  RAISE NOTICE '';
  RAISE NOTICE 'Silakan login di:';
  RAISE NOTICE 'http://localhost:3000/admin/login';
  RAISE NOTICE '========================================';
END $$;
