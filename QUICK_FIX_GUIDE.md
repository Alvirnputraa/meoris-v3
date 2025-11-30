# Quick Fix Guide - Voucher System

## Problem
- ✅ Callback working: `[Tripay] Voucher marked as used: ONGKIR7K`
- ✅ Order data exists with status PAID
- ❌ used_vouchers table is EMPTY
- ❌ Error: `user_id not present in table "users"`

## Root Causes
1. **Foreign Key too strict** - References auth.users but user_id might not exist there
2. **RLS blocking INSERT** - Service role can't insert to used_vouchers

---

## 🚀 Quick Fix (2 Minutes)

### Option A: All-in-One Script (EASIEST)

1. Open Supabase SQL Editor
2. Copy ENTIRE content of `FIX_ALL_IN_ONE.sql`
3. Paste and click **Run**
4. Wait for all sections to complete
5. Check verification output at the bottom

**Expected verification output:**
- RLS policies count: 3
- Foreign keys count: 0
- Used vouchers count: >= 1

### Option B: Step-by-Step (If you want control)

Run these files in order:

1. `fix_used_vouchers_foreign_key.sql` - Remove FK constraint
2. `fix_used_vouchers_rls_COMPLETE.sql` - Fix RLS policies
3. `insert_existing_paid_order_to_used_vouchers.sql` - Insert ONGKIR7K data

---

## After SQL Fix

### Rebuild & Restart App

```bash
npm run build
pm2 restart meoris-sandal
```

### Test with New Order

1. Make new order with different voucher
2. Pay until status PAID
3. Check logs:
   ```bash
   pm2 logs meoris-sandal --lines 50 | grep Tripay
   ```

**Expected logs:**
```
[Tripay] Voucher marked as used: VOUCHERCODE
[Tripay] Inserted data: [{ id: '...', ... }]
```

**If you see error instead:**
```
[Tripay] Failed to mark voucher as used: {...}
[Tripay] Error code: ...
[Tripay] Error message: ...
```
→ Share the error, we'll debug further

### Verify in Database

```sql
SELECT * FROM used_vouchers ORDER BY created_at DESC;
```

Should show:
- ONGKIR7K (manual insert)
- New voucher (from new order)

---

## Test in Browser

1. Go to http://localhost:3000/produk/detail-checkout
2. Press F12 → Console
3. Click voucher icon

**Expected:**
- ✅ No errors in console
- ✅ Voucher ONGKIR7K NOT in list
- ✅ Badge count decreased

---

## Troubleshooting

### Error: "relation does not exist"
```sql
-- Run: create_used_vouchers_table.sql
```

### Error: "duplicate key value"
Good! Voucher already in used_vouchers.

### Voucher still appears in browser
1. Hard refresh: Ctrl+Shift+R
2. Check data exists:
   ```sql
   SELECT * FROM used_vouchers WHERE voucher_code = 'ONGKIR7K';
   ```
3. Check browser console for errors

---

## Files Reference

| File | Purpose |
|------|---------|
| `FIX_ALL_IN_ONE.sql` | **Use this!** Complete fix in one script |
| `FIX_RLS_STEP_BY_STEP.md` | Detailed step-by-step guide |
| `fix_used_vouchers_foreign_key.sql` | Remove FK constraint |
| `fix_used_vouchers_rls_COMPLETE.sql` | Fix RLS policies |
| `insert_existing_paid_order_to_used_vouchers.sql` | Insert ONGKIR7K |
| `check_user_id.sql` | Debug user_id issues |

---

## Next Steps After Fix

1. ✅ Run `FIX_ALL_IN_ONE.sql`
2. ✅ Rebuild: `npm run build`
3. ✅ Restart: `pm2 restart meoris-sandal`
4. ✅ Test new order with voucher
5. ✅ Verify in browser

Good luck! 🎯
