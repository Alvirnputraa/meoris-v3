# Race Condition Analysis: Auto-Complete vs Return Request

## 🚨 CRITICAL ISSUE FOUND: Race Condition Detected!

## Problem Statement

Ketika user mengajukan permintaan pengembalian (return request) dan pengajuannya masih dalam proses peninjauan admin, sistem **auto-complete** tetap berjalan dan dapat menyebabkan order selesai secara otomatis meskipun ada return request yang sedang pending.

## Current System Behavior

### Auto-Complete Function
**File:** `create_auto_complete_function.sql`

```sql
UPDATE orders
SET
  status = 'completed',
  updated_at = NOW()
WHERE
  status = 'delivered'
  AND delivered_at IS NOT NULL
  AND delivered_at <= NOW() - INTERVAL '2 days'
  AND status != 'completed';
```

**Problem:** Fungsi ini **TIDAK mengecek** apakah ada return request yang sedang aktif!

### Return Request System
- User dapat submit return ketika order status = 'delivered' atau 'completed'
- Return request memiliki status: 'pending', 'approved', 'expired'
- Return yang masih 'pending' atau 'approved' adalah return yang **aktif**

## 🔴 Race Condition Scenarios

### Scenario 1: Return Pending Saat Auto-Complete
```
Timeline:
Day 1, 12:00 PM  → Order delivered
Day 2, 11:00 AM  → User submit return request (status='pending')
Day 2, 11:01 AM  → Admin sedang review return
Day 3, 01:00 PM  → Cron job runs auto_complete_delivered_orders()
Day 3, 01:00 PM  → ❌ Order status = 'completed' (meskipun return pending!)

Result:
- Order sudah completed
- Return request masih pending, tidak bisa diproses
- User kehilangan hak untuk return
- Data inconsistency
```

### Scenario 2: Return Approved, Belum Arrange Shipping
```
Timeline:
Day 1, 12:00 PM  → Order delivered
Day 1, 02:00 PM  → User submit return request
Day 1, 03:00 PM  → Admin approve return (status='approved')
Day 1, 04:00 PM  → User belum atur shipping
Day 3, 01:00 PM  → Cron job runs auto_complete_delivered_orders()
Day 3, 01:00 PM  → ❌ Order status = 'completed'

Result:
- Order sudah completed meskipun return approved
- User masih punya waktu 2 hari untuk atur shipping (dari approval)
- Tapi order sudah completed dalam 2 hari dari delivered
- Race condition!
```

### Scenario 3: Multiple Cron Jobs Conflict
```
Timeline:
Day 3, 01:00 PM  → auto_complete_delivered_orders() runs
                   → Tries to complete order with pending return
Day 3, 01:00 PM  → (Same time) auto_cancel_expired_returns() runs
                   → Tries to cancel expired return

Result: Undefined behavior, possible data corruption
```

## Current Logic Analysis

### 1. Auto-Complete Logic ❌
```sql
-- ONLY checks delivered status and time
WHERE
  status = 'delivered'
  AND delivered_at <= NOW() - INTERVAL '2 days'
```

**Missing:** Check for active returns!

### 2. Return Request Logic ✅
- User CAN submit return when status = 'delivered' ✓
- Return request creates entry in `returns` table ✓
- Admin reviews and approves/rejects ✓

### 3. UI Display ⚠️
Label: "Pesanan akan terselesaikan otomatis pada [DATE]"
- Shows deadline based on `delivered_at + 2 days`
- **Does NOT consider** if return request is submitted
- User sees countdown but doesn't know it will be cancelled if they submit return

## Answer to Your Question

### 1. Apakah sistem auto-complete tetap berfungsi ketika ada return pending?

**YA, TETAP BERFUNGSI!** ❌

Sistem auto-complete **TIDAK mengecek** apakah ada return request yang pending/approved. Function hanya melihat:
- Order status = 'delivered'
- delivered_at sudah lewat 2 hari

Jadi order akan di-complete meskipun ada return request aktif.

### 2. Apakah akan terjadi race condition?

**YA, RACE CONDITION PASTI TERJADI!** 🚨

Race condition terjadi dalam 3 skenario:

#### A. Timeline Race
```
User Action: Submit return (Day 2)
System Action: Auto-complete (Day 3)
→ Order completed before return processed
```

#### B. Status Race
```
Return Status: 'pending' or 'approved'
Order Status: Changes to 'completed'
→ Inconsistent state
```

#### C. Deadline Conflict
```
Auto-complete deadline: delivered_at + 2 days
Return arrange deadline: approved_at + 2 days
→ Different timelines cause confusion
```

## Impact Analysis

### User Impact 🙁
1. **Loss of Return Right**: User kehilangan hak pengembalian
2. **Confusing UX**: Countdown masih jalan tapi order sudah complete
3. **Trust Issues**: User merasa sistem tidak fair

### Business Impact 💼
1. **Customer Complaints**: Komplain akan meningkat
2. **Support Burden**: CS harus handle manual exceptions
3. **Legal Risk**: Possible violation of consumer protection laws

### Technical Impact 🔧
1. **Data Inconsistency**: Return aktif tapi order completed
2. **Orphaned Returns**: Return requests tanpa order yang valid
3. **Reporting Issues**: Metrics tidak akurat

## Recommended Solution

### Solution 1: Prevent Auto-Complete for Orders with Active Returns ✅ RECOMMENDED

**Update auto-complete function:**
```sql
UPDATE orders
SET
  status = 'completed',
  updated_at = NOW()
WHERE
  status = 'delivered'
  AND delivered_at IS NOT NULL
  AND delivered_at <= NOW() - INTERVAL '2 days'
  AND status != 'completed'
  -- NEW: Exclude orders with active return requests
  AND NOT EXISTS (
    SELECT 1 FROM returns r
    WHERE r.order_id = orders.id
    AND r.status IN ('pending', 'approved')
  );
```

### Solution 2: Update UI to Show Warning

When return is submitted, update countdown label:
```
Before: "Pesanan akan terselesaikan otomatis pada 14 November 2025 pukul 18:00"
After:  "Permintaan pengembalian sedang diproses. Auto-complete ditangguhkan."
```

### Solution 3: Add Database Constraint

Add check to prevent status change:
```sql
CREATE OR REPLACE FUNCTION prevent_complete_with_active_return()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'delivered' THEN
    IF EXISTS (
      SELECT 1 FROM returns
      WHERE order_id = NEW.id
      AND status IN ('pending', 'approved')
    ) THEN
      RAISE EXCEPTION 'Cannot complete order: Active return request exists';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Testing Scenarios

### Test 1: Submit Return Before Auto-Complete
1. Create delivered order (delivered_at = NOW() - 3 days)
2. Submit return request (status = 'pending')
3. Run auto_complete_delivered_orders()
4. **Expected:** Order remains 'delivered'
5. **Actual (before fix):** Order becomes 'completed' ❌

### Test 2: Approved Return Before Auto-Complete
1. Create delivered order (delivered_at = NOW() - 3 days)
2. Submit and approve return (status = 'approved')
3. Run auto_complete_delivered_orders()
4. **Expected:** Order remains 'delivered'
5. **Actual (before fix):** Order becomes 'completed' ❌

### Test 3: Expired Return - Auto-Complete Should Work
1. Create delivered order (delivered_at = NOW() - 3 days)
2. Submit return, approve, but expire (status = 'expired')
3. Run auto_complete_delivered_orders()
4. **Expected:** Order becomes 'completed' ✓
5. This is correct behavior

## Conclusion

### Current State: 🔴 BROKEN

1. ✅ Auto-complete function works
2. ✅ Return request system works
3. ❌ **NO protection against race condition**
4. ❌ **Systems conflict with each other**

### Required Actions:

**PRIORITY 1 (CRITICAL):**
- [ ] Fix auto-complete function to exclude orders with active returns
- [ ] Add database trigger to prevent manual status changes
- [ ] Test all scenarios

**PRIORITY 2 (HIGH):**
- [ ] Update UI to hide/modify auto-complete countdown when return submitted
- [ ] Add notification when return blocks auto-complete
- [ ] Update documentation

**PRIORITY 3 (MEDIUM):**
- [ ] Add logging for debugging race conditions
- [ ] Create monitoring for orphaned returns
- [ ] Add admin tools to resolve conflicts

## Files to Modify

1. `create_auto_complete_function.sql` - Add NOT EXISTS check
2. `src/app/user/purchase/detail/[orderId]/page.tsx` - Update UI logic
3. `src/app/produk/pesanan/[orderId]/OrderDetailClient.tsx` - Update countdown display
4. Add new file: `create_prevent_complete_with_return_trigger.sql`

---

**Status:** 🚨 CRITICAL - Race condition confirmed
**Risk Level:** HIGH - Can cause data inconsistency and customer complaints
**Recommended Action:** Implement Solution 1 immediately
