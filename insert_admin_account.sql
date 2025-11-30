-- ============================================
-- Insert Admin Account
-- ============================================
-- Script untuk membuat akun admin di Supabase Auth dan tabel admin_users
-- Email: admin@erdanpee.com
-- Password: 123456

-- PENTING: Script ini menggunakan fungsi khusus untuk membuat user di auth.users
-- Anda bisa menjalankan ini dengan 2 cara:

-- CARA 1: Menggunakan Supabase Dashboard (RECOMMENDED)
-- 1. Buka Supabase Dashboard > Authentication > Users
-- 2. Klik "Add User" atau "Invite User"
-- 3. Masukkan email: admin@erdanpee.com
-- 4. Masukkan password: 123456
-- 5. Klik "Create User"
-- 6. Copy UUID dari user yang baru dibuat
-- 7. Jalankan query di bawah ini dengan mengganti <USER_UUID> dengan UUID yang di-copy

/*
-- Ganti <USER_UUID> dengan UUID dari user yang baru dibuat di Supabase Auth
INSERT INTO public.admin_users (id, email, nama, role, is_active)
VALUES (
  '<USER_UUID>',  -- Ganti dengan UUID user dari auth.users
  'admin@erdanpee.com',
  'Admin Erdanpee',
  'super_admin',
  TRUE
);
*/

-- CARA 2: Menggunakan SQL Function (Jika Anda memiliki akses service_role)
-- Function untuk membuat admin user
CREATE OR REPLACE FUNCTION create_admin_user(
  p_email TEXT,
  p_password TEXT,
  p_nama TEXT,
  p_role TEXT DEFAULT 'admin'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Generate UUID untuk user baru
  new_user_id := gen_random_uuid();

  -- Insert ke auth.users (ini memerlukan privileges service_role)
  -- CATATAN: Ini hanya contoh, biasanya Supabase tidak mengizinkan insert langsung ke auth.users
  -- Lebih baik gunakan Supabase Dashboard atau API

  -- Insert ke public.admin_users
  INSERT INTO public.admin_users (id, email, nama, role, is_active)
  VALUES (new_user_id, p_email, p_nama, p_role, TRUE);

  RAISE NOTICE 'Admin user created with ID: %', new_user_id;
  RAISE NOTICE 'IMPORTANT: You need to create this user in Supabase Auth Dashboard with email: % and password: %', p_email, p_password;

  RETURN new_user_id;
END;
$$;

-- CARA 3: Manual Insert (Setelah membuat user di Supabase Dashboard)
-- Jika Anda sudah membuat user dengan email admin@erdanpee.com di Supabase Auth Dashboard,
-- Anda bisa langsung insert ke admin_users dengan query ini:

/*
-- Query untuk mengecek user ID dari email
SELECT id, email FROM auth.users WHERE email = 'admin@erdanpee.com';

-- Setelah dapat user ID, insert ke admin_users
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
*/

-- Grant permission untuk function
GRANT EXECUTE ON FUNCTION create_admin_user TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INSTRUKSI MEMBUAT AKUN ADMIN:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. Buka Supabase Dashboard';
  RAISE NOTICE '2. Pergi ke Authentication > Users';
  RAISE NOTICE '3. Klik "Add User" atau "Invite User"';
  RAISE NOTICE '4. Email: admin@erdanpee.com';
  RAISE NOTICE '5. Password: 123456';
  RAISE NOTICE '6. Klik "Create User"';
  RAISE NOTICE '7. Setelah user dibuat, jalankan query berikut:';
  RAISE NOTICE '';
  RAISE NOTICE 'INSERT INTO public.admin_users (id, email, nama, role, is_active)';
  RAISE NOTICE 'SELECT id, email, ''Admin Erdanpee'', ''super_admin'', TRUE';
  RAISE NOTICE 'FROM auth.users WHERE email = ''admin@erdanpee.com''';
  RAISE NOTICE 'ON CONFLICT (id) DO NOTHING;';
  RAISE NOTICE '========================================';
END $$;
