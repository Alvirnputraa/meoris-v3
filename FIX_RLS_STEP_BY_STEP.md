# Fix RLS Issue - Step by Step

## Problem Summary
- Server logs: `[Tripay] Voucher marked as used: ONGKIR7K` ✅
- Orders table: Data PAID dengan voucher ada ✅
- used_vouchers table: **KOSONG** ❌

**Root Cause:** RLS memblokir INSERT dari service role (supabaseAdmin)

---

## Solution: 4 Steps

### Step 1: Fix Foreign Key Constraint (PENTING!)

1. Buka Supabase Dashboard → SQL Editor
2. Copy seluruh isi file `fix_used_vouchers_foreign_key.sql`
3. Paste dan klik **Run**

**Apa yang akan dilakukan:**
- Drop foreign key constraint ke `auth.users` yang terlalu strict
- Tetap ada index untuk performance

**Why:** Error `user_id not present in table "users"` karena FK terlalu ketat.

---

### Step 2: Run RLS Fix di Supabase SQL Editor

1. Di SQL Editor yang sama
2. Copy seluruh isi file `fix_used_vouchers_rls_COMPLETE.sql`
3. Paste dan klik **Run**

**Apa yang akan dilakukan:**
- Drop semua policy lama yang salah
- Buat 3 policy baru yang benar:
  - `select_own_used_vouchers` - Client bisa SELECT voucher mereka
  - `service_role_insert_used_vouchers` - Server bisa INSERT dari callback
  - `insert_own_used_vouchers` - Client bisa INSERT voucher mereka (fallback)

**Expected output:**
Tabel verification akan show 3 policies.

---

### Step 3: Insert Data PAID yang Sudah Ada

Karena order ONGKIR7K sudah PAID sebelumnya, kita perlu manual insert:

1. Di Supabase SQL Editor
2. Copy seluruh isi file `insert_existing_paid_order_to_used_vouchers.sql`
3. Paste dan klik **Run**

**Expected output:**
Tabel verification akan show 1 row dengan voucher ONGKIR7K.

---

### Step 4: Rebuild & Restart App

Karena kita update `src/server/tripay.ts`, perlu rebuild:

```bash
npm run build
pm2 restart meoris-sandal
```

---

## Verification

### A. Check RLS Policies
```sql
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'used_vouchers';
```

**Expected:**
```
policyname                          | roles         | cmd
------------------------------------|---------------|--------
select_own_used_vouchers            | authenticated | SELECT
service_role_insert_used_vouchers   | service_role  | INSERT
insert_own_used_vouchers            | authenticated | INSERT
```

### B. Check Data in used_vouchers
```sql
SELECT * FROM used_vouchers;
```

**Expected:** Should show at least 1 row (ONGKIR7K)

### C. Test New Order dengan Voucher

1. Buat order baru dengan voucher lain (bukan ONGKIR7K)
2. Bayar sampai status PAID
3. Check logs:
   ```bash
   pm2 logs meoris-sandal --lines 50
   ```

**Expected logs:**
```
[Tripay] Voucher marked as used: VOUCHERCODE
[Tripay] Inserted data: [{ id: '...', user_id: '...', ... }]
```

**NOT like before:**
```
[Tripay] Voucher marked as used: VOUCHERCODE
(no "Inserted data" line = failed silently)
```

4. Verify di database:
   ```sql
   SELECT * FROM used_vouchers ORDER BY created_at DESC LIMIT 5;
   ```
   Should show new voucher entry.

---

## Test in Browser

Setelah semua step di atas:

1. Login sebagai user yang punya order PAID
2. Go to http://localhost:3000/produk/detail-checkout
3. Press F12 → Console tab
4. Click icon voucher

**Expected:**
- ✅ Console shows debug logs without errors
- ✅ Voucher "ONGKIR7K" **NOT in list** (already used)
- ✅ Badge count decreased

---

## Troubleshooting

### If Step 3 logs still show error:

Check logs dengan:
```bash
pm2 logs meoris-sandal --lines 100 | grep -A 5 "Tripay"
```

Look for:
```
[Tripay] Failed to mark voucher as used:
[Tripay] Error code: ...
[Tripay] Error message: ...
```

**Common errors:**

1. **"new row violates row-level security policy"**
   - RLS fix belum jalan atau policy masih salah
   - Re-run `fix_used_vouchers_rls_COMPLETE.sql`

2. **"duplicate key value violates unique constraint"**
   - Voucher sudah ada di used_vouchers (good!)
   - Check: `SELECT * FROM used_vouchers WHERE voucher_code = 'VOUCHERCODE';`

3. **"relation does not exist"**
   - Table belum dibuat
   - Run: `create_used_vouchers_table.sql`

### If voucher still appears in browser:

1. Hard refresh: Ctrl+Shift+R
2. Check if data exists:
   ```sql
   SELECT * FROM used_vouchers WHERE voucher_code = 'ONGKIR7K';
   ```
3. Check browser console for errors
4. Make sure user is logged in

---

## Final Checklist

- [ ] RLS policies fixed (3 policies exist)
- [ ] Data ONGKIR7K inserted to used_vouchers
- [ ] App rebuilt and restarted
- [ ] Logs show "Inserted data" for new orders
- [ ] Browser: Voucher ONGKIR7K tidak muncul di list
- [ ] New PAID orders auto-insert to used_vouchers

---

## Files to Use (In Order)

1. `fix_used_vouchers_foreign_key.sql` - Fix foreign key constraint
2. `fix_used_vouchers_rls_COMPLETE.sql` - Fix RLS policies
3. `insert_existing_paid_order_to_used_vouchers.sql` - Insert historical data
4. Rebuild app: `npm run build && pm2 restart meoris-sandal`
5. Test in browser

Good luck! 🚀
