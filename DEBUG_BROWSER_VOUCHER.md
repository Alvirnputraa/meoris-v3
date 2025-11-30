# Debug Browser Voucher Issue

## Problem
- ✅ Server callback working: voucher inserted to `used_vouchers`
- ✅ Database has data: 15KLETSGO in `used_vouchers` table
- ❌ Browser still shows voucher in list

## Possible Causes

### 1. RLS Blocking SELECT Query
Client (browser) cannot read `used_vouchers` table.

### 2. Browser Cache
Old data cached in browser.

### 3. Code Not Checking used_vouchers
Filter logic not working properly.

---

## Debugging Steps

### Step 1: Check Browser Console

1. Open http://localhost:3000/produk/detail-checkout
2. Press **F12** → **Console** tab
3. Click voucher icon in header
4. Look for these debug logs:

**Expected logs:**
```
[Voucher Debug] Used voucher codes: ['ONGKIR7K', '15KLETSGO']
[Voucher Debug] All vouchers before filter: ['ONGKIR7K', '15KLETSGO', 'OTHERVOUCHER']
[Voucher Debug] ONGKIR7K: expired=false, used=true
[Voucher Debug] 15KLETSGO: expired=false, used=true
[Voucher Debug] OTHERVOUCHER: expired=false, used=false
[Voucher Debug] Valid vouchers after filter: ['OTHERVOUCHER']
```

**If you see:**
```
Error loading used vouchers: {...}
```
→ **RLS is blocking!** Go to Step 2.

**If you see:**
```
[Voucher Debug] Used voucher codes: []
```
→ **Query returns empty!** RLS blocking. Go to Step 2.

**If you see:**
```
[Voucher Debug] Used voucher codes: ['ONGKIR7K', '15KLETSGO']
[Voucher Debug] 15KLETSGO: expired=false, used=true
```
But voucher still appears → **Filter logic issue**. Go to Step 3.

---

### Step 2: Fix RLS Policy

Run this in Supabase SQL Editor:

```sql
-- Check if SELECT policy exists
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'used_vouchers'
  AND cmd = 'SELECT'
  AND 'authenticated' = ANY(roles);
```

**If empty or wrong:**

```sql
-- Drop and recreate
DROP POLICY IF EXISTS "select_own_used_vouchers" ON used_vouchers;

CREATE POLICY "select_own_used_vouchers"
  ON used_vouchers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Verify
SELECT policyname FROM pg_policies WHERE tablename = 'used_vouchers';
```

**Expected:** Should show `select_own_used_vouchers`.

Then:
1. Hard refresh browser: **Ctrl+Shift+R**
2. Click voucher icon again
3. Check console logs

---

### Step 3: Verify Filter Logic

If logs show used voucher codes correctly but voucher still appears, check:

#### A. Voucher Code Mismatch

Maybe `voucher.voucher` in database is different from `used_vouchers.voucher_code`.

**Check in Supabase:**
```sql
-- Check voucher code format
SELECT
  v.voucher as code_in_voucher_table,
  uv.voucher_code as code_in_used_vouchers_table
FROM voucher v
LEFT JOIN used_vouchers uv ON uv.voucher_code = v.voucher
WHERE v.voucher IN ('ONGKIR7K', '15KLETSGO')
ORDER BY v.voucher;
```

**Expected:** Both columns should match exactly.

**If mismatch:** Case sensitivity or extra spaces issue.

#### B. Hard Refresh Browser

Sometimes React state doesn't update:

1. **Ctrl+Shift+R** (hard refresh)
2. Clear browser cache
3. Close and reopen voucher sidebar

---

### Step 4: Test Query Manually in Browser Console

While on the page with voucher sidebar open, run this in browser console:

```javascript
// Test if we can query used_vouchers
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data, error } = await supabase.auth.getUser();
console.log('User:', data?.user?.id);

const { data: usedData, error: usedError } = await supabase
  .from('used_vouchers')
  .select('voucher_code')
  .eq('user_id', data.user.id);

console.log('Used vouchers:', usedData);
console.log('Error:', usedError);
```

**If error:** RLS issue.
**If data is empty:** Check user_id matches.
**If data is correct:** Cache or filter issue.

---

## Quick Fixes

### Fix 1: RLS Policy (Most Likely)

```sql
-- Run in Supabase SQL Editor
DROP POLICY IF EXISTS "select_own_used_vouchers" ON used_vouchers;

CREATE POLICY "select_own_used_vouchers"
  ON used_vouchers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Fix 2: Hard Refresh Browser

**Ctrl+Shift+R** in browser.

### Fix 3: Clear Browser Storage

1. F12 → Application tab
2. Clear Storage → Clear site data
3. Refresh page
4. Login again

---

## Expected Final State

After all fixes:

1. **Browser Console Logs:**
   ```
   [Voucher Debug] Used voucher codes: ['ONGKIR7K', '15KLETSGO']
   [Voucher Debug] 15KLETSGO: expired=false, used=true
   ```

2. **Voucher Sidebar:**
   - ❌ 15KLETSGO NOT in list
   - ❌ ONGKIR7K NOT in list
   - ✅ Other unused vouchers appear

3. **Badge Count:**
   - Decreased by 2 (both used vouchers removed)

---

## Share Debug Info

If still not working, share these:

1. **Browser console logs** (after clicking voucher icon)
2. **Result of this query:**
   ```sql
   SELECT policyname, roles, cmd
   FROM pg_policies
   WHERE tablename = 'used_vouchers';
   ```
3. **Result of this query:**
   ```sql
   SELECT voucher_code FROM used_vouchers
   WHERE user_id = 'b41ef1ca-f2fb-47df-a4d7-b44fb2c22af3';
   ```
