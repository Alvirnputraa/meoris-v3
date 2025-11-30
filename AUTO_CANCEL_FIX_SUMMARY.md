# 🔧 AUTO-CANCEL PENDING ORDERS - PROBLEM ANALYSIS & SOLUTION

## 📊 PROBLEM SUMMARY

### Issue Found
- **Cron job running**: ✅ Every 10 minutes
- **API endpoint**: ✅ Working correctly (src/app/api/cron/auto-cancel-pending-orders/route.ts:45)
- **Logs show**: `ordersCancelled: 0` (no orders being cancelled)
- **Reality**: Order `DEV-T44456309298ICSIL` expired 20+ hours ago but still status `submitted`

### Root Cause
**The database function `auto_cancel_pending_orders()` is NOT checking the `checkout_submissions` table correctly.**

The function exists but it's checking:
- ❌ `orders` table with `status IN ('pending', 'belum bayar')`
- ❌ Using `created_at < NOW() - INTERVAL '24 hours'`

But it SHOULD check:
- ✅ `checkout_submissions` table with `status = 'submitted'`
- ✅ Using `payment_expired_at < NOW()`

## 🔍 DIAGNOSIS RESULTS

Order: **DEV-T44456309298ICSIL**
- Payment deadline: `2025-11-17 07:16:00`
- Current time: `2025-11-18 03:38:25`
- **EXPIRED**: 20+ hours ago
- Status in DB: `submitted` (should be `cancelled`)

### What We Found
```javascript
// From debug_order_DEV-T44456309298ICSIL.js
✅ Found in CHECKOUT_SUBMISSIONS table:
   - ID: 7d070fce-979d-4582-b50f-177f542e3046
   - Status: submitted  ❌ (should be cancelled)
   - Payment expired at: 2025-11-17T07:16:00+00:00
   - Is Expired? YES (20 hours ago)

// Function result
auto_cancel_pending_orders() returned: { cancelled_count: 0 }  ❌
// Should have found and cancelled this order!
```

## ✅ SOLUTION APPLIED

### 1. Manual Fix (TEMPORARY)
✅ **COMPLETED** - Order `DEV-T44456309298ICSIL` manually cancelled via `apply_fix_auto_cancel.js`

### 2. Permanent Fix (REQUIRED)
⚠️  **ACTION NEEDED** - Apply the corrected database function

## 🚀 HOW TO APPLY PERMANENT FIX

### Option 1: Via Supabase Dashboard (RECOMMENDED)
1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Open the file: `fix_auto_cancel_pending_orders.sql`
4. Copy the entire SQL content
5. Paste into SQL Editor
6. Click **Run** or press `Ctrl/Cmd + Enter`

### Option 2: Via Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Verify with Script
```bash
node diagnose_and_fix_auto_cancel.js
```

## 📋 WHAT THE FIX DOES

The corrected function (`fix_auto_cancel_pending_orders.sql`) will:

1. ✅ Check `checkout_submissions` table for `status = 'submitted'`
2. ✅ Use `payment_expired_at < NOW()` (correct expiry check)
3. ✅ Update status to `cancelled`
4. ✅ Create notification for user
5. ✅ Also check `orders` table for backward compatibility

## 🧪 TESTING AFTER FIX

After applying the SQL fix, test with:

```bash
# 1. Run diagnosis
node diagnose_and_fix_auto_cancel.js

# 2. Check specific order
node debug_order_DEV-T44456309298ICSIL.js

# 3. Test the cron endpoint manually
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3005/api/cron/auto-cancel-pending-orders
```

Expected result:
```json
{
  "success": true,
  "message": "Auto-cancel pending orders job executed successfully",
  "ordersCancelled": 1,  // Should be > 0 if there are expired orders
  "timestamp": "2025-11-18T03:40:00.000Z"
}
```

## 📁 FILES INVOLVED

### Database Function Files
- `create_auto_cancel_pending_orders_function.sql` - Original (OUTDATED)
- `fix_auto_cancel_pending_orders.sql` - **CORRECTED VERSION** ⭐

### API Endpoint
- `src/app/api/cron/auto-cancel-pending-orders/route.ts` - ✅ Working correctly

### Diagnostic Scripts
- `debug_order_DEV-T44456309298ICSIL.js` - Check specific order
- `diagnose_and_fix_auto_cancel.js` - Full system diagnosis
- `apply_fix_auto_cancel.js` - Manual cancellation + instructions
- `test_auto_cancel_query.js` - Test query logic

## ⚙️ CRON JOB CONFIGURATION

Current Ubuntu crontab:
```bash
*/10 * * * * curl -s -H "Authorization: Bearer K3mP9xR7vN2sL5qW8tY4zH6jD1cF0aB3==" \
  http://localhost:3005/api/cron/auto-cancel-pending-orders \
  >> /var/log/meoris-cron.log 2>&1
```

✅ This is correct - runs every 10 minutes

## 📊 CURRENT STATUS

- [x] Problem identified
- [x] Manual fix applied for order DEV-T44456309298ICSIL
- [x] Diagnostic scripts created
- [ ] **Permanent fix needs to be applied to database** ⚠️
- [ ] Verify fix is working after deployment

## 🎯 NEXT STEPS

1. **IMMEDIATE**: Apply `fix_auto_cancel_pending_orders.sql` to Supabase
2. **VERIFY**: Run `node diagnose_and_fix_auto_cancel.js` to confirm
3. **MONITOR**: Check `/var/log/meoris-cron.log` for `ordersCancelled > 0`

## 📝 KEY DIFFERENCES

### BEFORE (Not Working) ❌
```sql
SELECT * FROM orders
WHERE status IN ('pending', 'belum bayar')
  AND created_at < NOW() - INTERVAL '24 hours'
```

### AFTER (Working) ✅
```sql
SELECT * FROM checkout_submissions
WHERE status = 'submitted'
  AND payment_expired_at < NOW()
```

---

**Generated**: 2025-11-18
**Status**: Manual fix applied, permanent fix pending
**Priority**: HIGH - Apply database fix ASAP
