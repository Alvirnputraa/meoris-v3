# DIAGNOSA DAN SOLUSI - Notifikasi Tidak Muncul

## Root Cause Analysis

### Masalah yang Ditemukan:
1. ✅ RLS Policy **SUDAH DIBUAT** untuk tabel `notifications`
2. ✅ Data notifikasi **ADA** di database (4 notifikasi)
3. ✅ Login menggunakan `supabase.auth.signInWithPassword()` (SUDAH BENAR)
4. ❌ **Supabase session mungkin tidak persist** di browser

### Kenapa Notifikasi Return 0?

RLS policy menggunakan `auth.uid()` yang mengambil user ID dari **Supabase auth session**.

Jika session tidak ter-set dengan benar:
```
auth.uid() → NULL
user_id = NULL → FALSE (tidak cocok dengan user_id di notifications)
Result: 0 notifications
```

## Cara Verify Masalah

### Option 1: Gunakan Debug Page
1. Buka file: `debug_supabase_session.html` di browser
2. Lihat apakah "Supabase session found" atau "No Supabase session"
3. Jika session NULL → masalahnya ada di sini

### Option 2: Check di Browser Console
Buka halaman notifications, tekan F12, dan jalankan di console:

```javascript
const { data } = await supabase.auth.getSession();
console.log('Session:', data.session);
console.log('User ID:', data.session?.user?.id);
```

**Expected:**
- Session: Object dengan user
- User ID: bc349ae8-09bc-45f9-8628-8a933636db8e

**Jika NULL:**
- Berarti session tidak ter-set
- auth.uid() akan return NULL
- RLS akan block semua queries

## Solusi

### Solusi 1: Pastikan Cookie Storage Enabled

Supabase menggunakan cookies untuk menyimpan session. Cek di `src/lib/supabase.ts`:

**Current code:**
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,  // ← Harus true
    detectSessionInUrl: true
  }
})
```

Ini sudah benar! ✅

### Solusi 2: Re-login untuk Set Session

Jika session hilang setelah login, coba:

1. Logout dari aplikasi
2. Clear browser cookies dan localStorage:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
3. Login kembali
4. Cek apakah notifications muncul

### Solusi 3: Verify Login Flow

Di `src/lib/auth.ts`, pastikan login function sudah benar:

```typescript
async login(email: string, password: string) {
  // ✅ This is correct - it sets Supabase session
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('User not found')

  // Session is automatically stored by Supabase
  // ...
}
```

Ini sudah benar! ✅

### Solusi 4: Check Browser Storage

Supabase menyimpan session di localStorage dengan key yang dimulai dengan `sb-`.

Check di Browser DevTools:
1. Tekan F12
2. Pergi ke Application/Storage tab
3. Lihat LocalStorage untuk `localhost:3000`
4. Cari key seperti: `sb-vtwooclhjobgdgvljauq-auth-token`

**Jika tidak ada:**
- Session tidak tersimpan
- Mungkin ada issue dengan browser storage permissions
- Try different browser (Chrome/Firefox)

### Solusi 5: Temporary Workaround - Allow Public Access

**WARNING: HANYA UNTUK TESTING LOKAL!**

Jika Anda ingin test apakah masalahnya memang di session, jalankan SQL ini **SEMENTARA**:

```sql
-- TEMPORARY: Allow all authenticated users to see all notifications
DROP POLICY IF EXISTS "temp_allow_all" ON notifications;
CREATE POLICY "temp_allow_all"
ON notifications
FOR SELECT
TO public  -- ← Allow anyone (NOT SECURE!)
USING (true);
```

Jika ini berhasil menampilkan notifications:
- ✅ Confirms masalahnya ada di auth.uid()
- ❌ Berarti session tidak ter-set dengan benar

**REMEMBER:** Hapus policy ini setelah testing:
```sql
DROP POLICY IF EXISTS "temp_allow_all" ON notifications;
```

Dan re-apply policy yang benar:
```sql
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

## Action Items

### Langkah 1: Diagnosa
- [ ] Buka `debug_supabase_session.html` di browser (after login)
- [ ] Check apakah session ada atau NULL
- [ ] Screenshot hasilnya

### Langkah 2: Jika Session NULL
- [ ] Logout dari app
- [ ] Clear browser storage
- [ ] Login kembali
- [ ] Check session lagi

### Langkah 3: Jika Masih Bermasalah
- [ ] Try browser lain (Chrome/Firefox/Edge)
- [ ] Check browser console untuk errors
- [ ] Check Network tab untuk failed requests

### Langkah 4: Alternative - Test dengan Public Policy
- [ ] Apply temporary public policy (TESTING ONLY!)
- [ ] Check apakah notifications muncul
- [ ] Remove public policy
- [ ] Re-apply authenticated policy

## Expected Final State

Setelah fix:
```
✅ Login → Supabase session created
✅ Session stored in browser localStorage
✅ Notifications page → query with auth.uid()
✅ RLS matches user_id = auth.uid()
✅ Notifications loaded successfully (4 items)
```

## Debugging Commands

### In Browser Console:

```javascript
// Check session
const { data } = await supabase.auth.getSession();
console.log('Session:', data.session);

// Check user
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// Try to get notifications
const { data: notifs, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id);
console.log('Notifications:', notifs, 'Error:', error);

// Check localStorage
console.log('LocalStorage user:', localStorage.getItem('user'));
console.log('Supabase token:', Object.keys(localStorage).filter(k => k.startsWith('sb-')));
```

## Files Created

- `debug_supabase_session.html` - Debug page untuk check session
- `APPLY_THIS_SQL_IN_SUPABASE.sql` - RLS policies (already applied)
- `cleanup_duplicate_policies.sql` - Clean up duplicate policies
- `test_notification_rls.js` - Test RLS dari Node.js
- `verify_rls_fix.js` - Verify fix
- `DIAGNOSA_DAN_SOLUSI.md` - This file

## Next Steps

1. Buka `debug_supabase_session.html` di browser SETELAH login
2. Screenshot hasilnya dan kirim ke saya
3. Saya akan bantu identify masalah lebih spesifik

Jika session sudah ada tapi notifications masih 0, berarti ada issue lain yang perlu kita investigasi.
