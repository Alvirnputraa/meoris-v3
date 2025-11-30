/**
 * Script untuk membuat admin user menggunakan Supabase Admin API
 * Run: node create_admin_user.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Ambil credentials dari .env atau .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key (bukan anon key!)

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env file');
  console.log('\nTambahkan ke .env atau .env.local:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your-project-url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log('\n⚠️  Service role key bisa ditemukan di:');
  console.log('Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

// Create admin client dengan service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Data admin
const ADMIN_EMAIL = 'admin@erdanpee.com';
const ADMIN_PASSWORD = '123456';
const ADMIN_NAME = 'Admin Erdanpee';
const ADMIN_ROLE = 'super_admin';

async function createAdminUser() {
  console.log('========================================');
  console.log('🚀 Membuat Admin User...');
  console.log('========================================');
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log('');

  try {
    // Step 1: Create user di Supabase Auth
    console.log('📝 Step 1: Membuat user di Supabase Auth...');

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto confirm email
      user_metadata: {
        full_name: ADMIN_NAME
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User sudah ada di auth.users, akan lanjut ke step 2...');

        // Get existing user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) throw listError;

        const existingUser = users.find(u => u.email === ADMIN_EMAIL);
        if (!existingUser) {
          throw new Error('User tidak ditemukan');
        }

        authData.user = existingUser;
      } else {
        throw authError;
      }
    } else {
      console.log('✅ User berhasil dibuat di auth.users');
      console.log(`   User ID: ${authData.user.id}`);
    }

    const userId = authData.user.id;

    // Step 2: Create atau update data di admin_users table
    console.log('\n📝 Step 2: Membuat data di tabel admin_users...');

    const { error: adminError } = await supabase
      .from('admin_users')
      .upsert({
        id: userId,
        email: ADMIN_EMAIL,
        nama: ADMIN_NAME,
        role: ADMIN_ROLE,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (adminError) {
      throw adminError;
    }

    console.log('✅ Admin data berhasil dibuat di admin_users');

    // Step 3: Verify
    console.log('\n📝 Step 3: Verifikasi...');

    const { data: verifyData, error: verifyError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', ADMIN_EMAIL)
      .single();

    if (verifyError) {
      throw verifyError;
    }

    console.log('✅ Verifikasi berhasil!');
    console.log('\nData Admin:');
    console.log('  ID:', verifyData.id);
    console.log('  Email:', verifyData.email);
    console.log('  Nama:', verifyData.nama);
    console.log('  Role:', verifyData.role);
    console.log('  Status:', verifyData.is_active ? 'Active' : 'Inactive');
    console.log('  Created:', verifyData.created_at);

    // Success
    console.log('\n========================================');
    console.log('🎉 SETUP BERHASIL!');
    console.log('========================================');
    console.log('\n✅ Admin user berhasil dibuat!');
    console.log('\n📍 Login credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n🌐 Login URL:');
    console.log('   http://localhost:3000/admin/login');
    console.log('\n⚠️  PENTING: Ganti password setelah first login!');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nDetail:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Pastikan SUPABASE_SERVICE_ROLE_KEY benar di .env');
    console.log('2. Pastikan tabel admin_users sudah dibuat (jalankan create_admin_users_table.sql)');
    console.log('3. Cek Supabase Dashboard > Authentication > Users');
    process.exit(1);
  }
}

// Run the script
createAdminUser();
