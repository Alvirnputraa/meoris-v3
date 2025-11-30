# Fix RLS Issue - Used Vouchers

## Problem
Voucher yang sudah digunakan tidak hilang dari list karena RLS (Row Level Security) memblokir query ke tabel `used_vouchers`.

## Root Cause
1. RLS policy terlalu ketat
2. User tidak bisa query `used_vouchers` mereka sendiri
3. Client-side query gagal silent (no error in console)

## Solution

### Quick Test: Disable RLS Temporarily

**WARNING: Only for testing! Don't use in production!**

```sql
-- File: disable_rls_used_vouchers_TEMP.sql
ALTER TABLE used_vouchers DISABLE ROW LEVEL SECURITY;
```

Setelah run ini:
1. Refresh browser
2. Klik icon voucher
3. Jika voucher hilang → **Confirmed RLS issue**
4. Jika masih muncul → Bukan masalah RLS, ada issue lain

### Permanent Fix: Fix RLS Policies

Jalankan di Supabase SQL Editor:

```sql
-- File: fix_used_vouchers_rls.sql
```

Script ini akan:
1. Drop semua policy lama
2. Create policy baru yang benar:
   - `select_own_used_vouchers` - User bisa SELECT voucher mereka
   - `insert_own_used_vouchers` - User bisa INSERT voucher mereka
3. Enable RLS kembali

### Verify Policies

```sql
-- Check policies
SELECT
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'used_vouchers';
```

**Expected output:**
```
policyname                  | cmd    | using_expression        | with_check_expression
select_own_used_vouchers    | SELECT | (auth.uid() = user_id) | NULL
insert_own_used_vouchers    | INSERT | NULL                   | (auth.uid() = user_id)
```

## Testing After Fix

### 1. Insert Test Data

Gunakan salah satu cara:

**Option A: Via Script**
```bash
node quick_fix_insert_used_voucher.js
```

**Option B: Manual SQL**
```sql
-- Replace dengan data real
INSERT INTO used_vouchers (user_id, voucher_code, order_id, used_at)
VALUES (
  'your-user-id-here',
  'VOUCHER123',
  'order-id-here',
  NOW()
)
ON CONFLICT (user_id, voucher_code) DO NOTHING;
```

**Option C: Migration untuk semua order PAID**
```sql
-- File: migrate_existing_paid_orders_vouchers.sql
-- File: migrate_existing_paid_checkouts_vouchers.sql
```

### 2. Verify di Browser

1. Login sebagai user
2. Buka Developer Tools (F12) → Console
3. Go to `/produk/detail-checkout`
4. Klik icon voucher
5. Check console logs:

**Expected logs (SUCCESS):**
```
[Voucher Debug] Used voucher codes: ['VOUCHER123']
[Voucher Debug] All vouchers before filter: ['VOUCHER123', 'VOUCHER456']
[Voucher Debug] VOUCHER123: expired=false, used=true
[Voucher Debug] VOUCHER456: expired=false, used=false
[Voucher Debug] Valid vouchers after filter: ['VOUCHER456']
```

**If you see error:**
```
Error loading used vouchers: {...}
```
→ RLS masih blocking atau ada error lain

### 3. Verify Count Badge

Badge di header seharusnya kurang 1 (voucher yang sudah used tidak dihitung).

## Common Issues & Solutions

### Issue 1: "relation does not exist"
**Solution:** Table belum dibuat
```sql
-- Run: create_used_vouchers_table.sql
```

### Issue 2: "new row violates row-level security policy"
**Solution:** Policy untuk INSERT salah
```sql
-- Run: fix_used_vouchers_rls.sql
```

### Issue 3: No error tapi query returns empty
**Solution:** Policy untuk SELECT salah
```sql
-- Run: fix_used_vouchers_rls.sql
```

### Issue 4: Still not working after RLS fix
**Possible causes:**
1. Browser cache → Hard refresh (Ctrl+Shift+R)
2. User not authenticated → Check if logged in
3. Data belum di-insert → Run migration scripts
4. Callback belum jalan untuk order baru → Check server logs

## Re-enable RLS After Testing

Jika Anda disable RLS untuk testing:

```sql
ALTER TABLE used_vouchers ENABLE ROW LEVEL SECURITY;

-- Then run proper policies
-- File: fix_used_vouchers_rls.sql
```

## Verification Checklist

- [ ] Table `used_vouchers` exists
- [ ] RLS is enabled on `used_vouchers`
- [ ] Policies allow SELECT for own vouchers
- [ ] Policies allow INSERT for own vouchers
- [ ] Data exists in `used_vouchers` table
- [ ] Browser console shows debug logs without errors
- [ ] Voucher count badge decreases
- [ ] Used voucher tidak muncul di list
- [ ] New orders auto-insert to `used_vouchers` after PAID

## Final Test: End-to-End

1. Claim new voucher
2. Add product to cart
3. Apply voucher at checkout
4. Complete payment until PAID
5. Wait for callback (check server logs)
6. Refresh and open voucher sidebar
7. Used voucher should be GONE

If step 7 fails:
- Check server logs for callback errors
- Verify `used_vouchers` table has new entry
- Check browser console for RLS errors
