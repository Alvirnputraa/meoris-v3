# Verification Steps for Voucher Fix

## Current Status ✅
- Server callback is working (logs show: `[Tripay] Voucher marked as used: ONGKIR7K`)
- Database has PAID order with voucher data filled
- Issue: RLS policies blocking client-side queries

## Step 1: Run RLS Fix in Supabase SQL Editor

Copy and paste the entire content of `fix_used_vouchers_rls.sql` into Supabase SQL Editor and run it.

This will:
- Drop all old/conflicting policies
- Create correct policies for SELECT and INSERT
- Enable RLS with proper permissions
- Verify policies are set correctly

## Step 2: Verify Data Exists in used_vouchers

Run this query in Supabase SQL Editor:

```sql
SELECT
  uv.*,
  o.order_number,
  o.status,
  o.total_amount
FROM used_vouchers uv
JOIN orders o ON o.id = uv.order_id
WHERE uv.voucher_code = 'ONGKIR7K'
ORDER BY uv.created_at DESC;
```

**Expected Result:** Should return 1 row showing the used voucher with order details.

**If empty:** Run this to check if callback created the entry:

```sql
-- Check if entry exists at all
SELECT COUNT(*) as total_used_vouchers FROM used_vouchers;

-- If 0, check the orders table
SELECT
  o.id,
  o.user_id,
  o.order_number,
  o.status,
  o.voucher_code,
  o.discount_amount,
  cs.order_summary->>'voucher_code' as summary_voucher
FROM orders o
LEFT JOIN checkout_submissions cs ON cs.id = o.checkout_submission_id
WHERE o.status = 'paid'
  AND (o.voucher_code IS NOT NULL OR cs.order_summary->>'voucher_code' IS NOT NULL)
ORDER BY o.created_at DESC
LIMIT 5;
```

If you see the order but not in used_vouchers, manually insert it:

```sql
-- Get the user_id and order_id from the query above, then:
INSERT INTO used_vouchers (user_id, voucher_code, order_id, used_at)
VALUES (
  'YOUR_USER_ID_HERE',  -- From the query above
  'ONGKIR7K',
  'YOUR_ORDER_ID_HERE',  -- From the query above
  NOW()
)
ON CONFLICT (user_id, voucher_code) DO NOTHING;
```

## Step 3: Test in Browser

1. **Open Developer Tools** (F12) in your browser
2. **Go to Console tab**
3. **Navigate to:** http://localhost:3000/produk/detail-checkout
4. **Click the voucher icon** in the header

**What to look for in Console:**

✅ **SUCCESS - Should see:**
```
[Voucher Debug] Used voucher codes: ['ONGKIR7K']
[Voucher Debug] All vouchers before filter: ['ONGKIR7K', 'OTHERVOUCHER']
[Voucher Debug] ONGKIR7K: expired=false, used=true
[Voucher Debug] Valid vouchers after filter: ['OTHERVOUCHER']
```

❌ **ERROR - If you see:**
```
Error loading used vouchers: {...}
```
→ RLS is still blocking. Double-check you ran the RLS fix script.

## Step 4: Verify Voucher Disappeared

After clicking the voucher icon:
- ✅ Voucher "ONGKIR7K" should NOT appear in the list
- ✅ Badge count in header should be decreased by 1
- ✅ Other unused vouchers should still appear normally

## Step 5: Test End-to-End (Optional)

To test the complete flow with a new order:

1. Claim a new voucher (not ONGKIR7K)
2. Add product to cart
3. Go to detail-checkout and apply the voucher
4. Complete payment until status is PAID
5. Check server logs for: `[Tripay] Voucher marked as used: VOUCHERCODE`
6. Refresh the page and click voucher icon
7. The voucher should be gone from the list

## Troubleshooting

### Issue: "Error loading used vouchers"
**Solution:** Check browser console for exact error. Likely RLS issue.
```sql
-- Re-run the RLS fix
-- File: fix_used_vouchers_rls.sql
```

### Issue: Voucher still appears in list
**Possible causes:**
1. Browser cache - Hard refresh (Ctrl+Shift+R)
2. Data not in used_vouchers table - Run Step 2 queries
3. RLS not fixed - Re-run fix_used_vouchers_rls.sql
4. User not logged in - Check authentication

### Issue: Debug logs not showing
**Solution:** Make sure you're looking at Console tab in DevTools, not Network or other tabs.

## Quick Check Commands

```bash
# Check if dev server is running
# Should see "Local: http://localhost:3000"

# If you make any code changes, restart the dev server
```

## Expected Final State

- ✅ RLS policies are correctly set
- ✅ used_vouchers table has entry for ONGKIR7K
- ✅ Browser console shows debug logs without errors
- ✅ Voucher ONGKIR7K does NOT appear in list
- ✅ Badge count reflects only unused vouchers
- ✅ Future PAID orders automatically mark vouchers as used
