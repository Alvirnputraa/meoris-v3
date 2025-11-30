# Final Verification Steps - Voucher System Fix

## Quick Summary
✅ **Callback is working** - Server logs show: `[Tripay] Voucher marked as used: ONGKIR7K`
✅ **Database has data** - Query shows 1 PAID order with voucher
⏳ **Need to fix** - RLS policies to allow client to read used_vouchers

---

## 🚀 Quick Fix (3 Steps)

### Step 1: Fix RLS Policies (Run in Supabase SQL Editor)

Open Supabase SQL Editor and run the entire content of:
```
fix_used_vouchers_rls.sql
```

This will drop old policies and create correct ones.

### Step 2: Verify Data Exists (Run in Supabase SQL Editor)

```sql
SELECT * FROM used_vouchers WHERE voucher_code = 'ONGKIR7K';
```

**If it returns data:** ✅ Great! Go to Step 3.

**If it returns empty:** Run this to manually insert:

```sql
-- First, get the user_id and order_id
SELECT
  o.id as order_id,
  o.user_id,
  o.order_number,
  o.voucher_code
FROM orders o
WHERE o.status = 'paid' AND o.voucher_code = 'ONGKIR7K'
LIMIT 1;

-- Copy the user_id and order_id from results, then run:
INSERT INTO used_vouchers (user_id, voucher_code, order_id, used_at)
VALUES (
  'PASTE_USER_ID_HERE',
  'ONGKIR7K',
  'PASTE_ORDER_ID_HERE',
  NOW()
);
```

### Step 3: Test in Browser

1. Open http://localhost:3000/produk/detail-checkout
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Click the **voucher icon** in the header

**Expected Result:**
- Console shows debug logs without errors
- Voucher "ONGKIR7K" **does NOT appear** in the list
- Badge count is decreased

---

## 📋 Detailed Verification (Optional)

If you want to be thorough, run this comprehensive check:

### Run Complete System Check

In Supabase SQL Editor, run:
```
check_voucher_system_status.sql
```

This will check:
1. ✅ RLS policies are correctly set (should show 2 policies)
2. ✅ Table structure is correct
3. ✅ Used vouchers data exists
4. ✅ PAID orders are tracked
5. ⚠️ Any missing entries that need migration

### Backfill Existing PAID Orders (If Needed)

If the system check shows missing entries, run:
```
migrate_existing_paid_orders_vouchers.sql
```

This ensures all historical PAID orders are tracked.

---

## 🐛 Troubleshooting

### Problem: "Error loading used vouchers" in console

**Solution:**
```sql
-- Re-run the RLS fix
-- Copy content from: fix_used_vouchers_rls.sql
```

### Problem: Voucher still appears in list

**Check these in order:**

1. **Hard refresh browser** - Press Ctrl+Shift+R
2. **Check if data exists:**
   ```sql
   SELECT * FROM used_vouchers WHERE voucher_code = 'ONGKIR7K';
   ```
3. **Check RLS policies:**
   ```sql
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'used_vouchers';
   ```
   Should show: `select_own_used_vouchers` and `insert_own_used_vouchers`

4. **Check if user is logged in** - Make sure you're authenticated

### Problem: No debug logs in console

**Solution:**
- Make sure you're on the **Console** tab (not Network or Elements)
- Refresh the page with F12 already open
- Click the voucher icon to trigger the query

---

## ✅ Success Checklist

After completing all steps, you should have:

- [ ] RLS policies fixed (2 policies: select and insert)
- [ ] Data exists in `used_vouchers` table
- [ ] Browser console shows debug logs without errors
- [ ] Voucher "ONGKIR7K" does NOT appear in voucher list
- [ ] Badge count decreased by 1
- [ ] Future PAID orders auto-insert to `used_vouchers`

---

## 🎯 Next Steps After Verification

Once confirmed working:

1. **Test end-to-end:**
   - Claim new voucher
   - Make purchase with voucher
   - Verify it disappears after payment PAID

2. **Clean up debug logs** (optional):
   - Remove console.log statements from `src/components/layout/Header.tsx`
   - Lines with `[Voucher Debug]` prefix

3. **Monitor production:**
   - Check server logs for `[Tripay] Voucher marked as used`
   - Verify vouchers disappear for real users

---

## 📞 Need Help?

If voucher still appears after all steps:

1. Share the browser console output (F12 → Console)
2. Share result of this query:
   ```sql
   SELECT * FROM used_vouchers WHERE voucher_code = 'ONGKIR7K';
   ```
3. Share result of:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'used_vouchers';
   ```
