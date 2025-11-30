# 🧪 AUTO-CANCEL SYSTEM - TEST PLAN

## ✅ SQL FIX STATUS
**APPLIED!** Database function `auto_cancel_pending_orders()` sudah di-update.

## 📊 TEST ORDER DETAILS

**Order Reference**: `DEV-T44456309544KBIRG`
- **Order ID**: `9fbf1f3b-ac2e-467b-94a7-3969157c1633`
- **Status Current**: `submitted` (Belum dibayar)
- **Deadline**: **18 November 2025 pukul 11:30 WIB**
- **Current Time**: 18 November 2025 pukul 11:24 WIB
- **Time Until Expiry**: 5-6 menit

## 🎯 EXPECTED BEHAVIOR

### Timeline:
1. **11:30 WIB** - Order expired
2. **11:30-11:40 WIB** - Cron job runs (every 10 minutes)
3. **Status changes** - `submitted` → `cancelled`
4. **User notified** - Gets "Pesanan dibatalkan" notification

## 🔧 MONITORING OPTIONS

### Option 1: Auto Monitor (Recommended)
```bash
node monitor_auto_cancel_test.js
```
Script ini akan:
- ✅ Check order status setiap 30 detik
- ✅ Auto-detect ketika order di-cancel
- ✅ Tampilkan real-time updates
- ✅ Stop otomatis setelah success atau 15 menit

### Option 2: Manual Check
```bash
# Check order status
node verify_order_DEV-T44456309544KBIRG.js

# Check cron logs
tail -f /var/log/meoris-cron.log
```

### Option 3: Manual Trigger (Force Cancel Now)
```bash
curl -s -H "Authorization: Bearer K3mP9xR7vN2sL5qW8tY4zH6jD1cF0aB3==" \
  http://localhost:3005/api/cron/auto-cancel-pending-orders
```

## 📋 SUCCESS CRITERIA

Auto-cancel system dianggap **WORKING** jika:

1. ✅ Order status berubah dari `submitted` → `cancelled`
2. ✅ Cron log menunjukkan `"ordersCancelled": 1` (bukan 0)
3. ✅ User dapat notifikasi di database `notifications` table
4. ✅ Website tidak menampilkan order di list "Belum dibayar"

## 🐛 TROUBLESHOOTING

### Jika order TIDAK di-cancel setelah deadline:

1. **Check database function applied:**
   ```sql
   -- Run di Supabase SQL Editor
   SELECT * FROM auto_cancel_pending_orders();
   ```
   Expected: `cancelled_count: 1`

2. **Check cron running:**
   ```bash
   tail -f /var/log/meoris-cron.log
   ```
   Look for: `"ordersCancelled": 1`

3. **Check order data:**
   ```bash
   node verify_order_DEV-T44456309544KBIRG.js
   ```
   Should show: Status = "cancelled"

## 📊 TEST RESULTS TEMPLATE

```
=================================================
AUTO-CANCEL SYSTEM TEST RESULTS
=================================================

Test Date: 18 November 2025
Test Order: DEV-T44456309544KBIRG
Deadline: 11:30 WIB

SQL Fix Applied: ✅ YES / ❌ NO
Order Expired At: [TIME]
Order Cancelled At: [TIME]
Time Difference: [X] minutes after expiry

Status Change: submitted → cancelled ✅ / ❌
Cron Log Shows: ordersCancelled: 1 ✅ / ❌
Notification Created: ✅ / ❌

Overall Result: ✅ PASS / ❌ FAIL
=================================================
```

## 🚀 NEXT STEPS AFTER TEST

### If Test PASSES ✅
1. Auto-cancel system confirmed working
2. No further action needed
3. Future expired orders will auto-cancel every 10 minutes

### If Test FAILS ❌
1. Check if SQL fix was actually applied to Supabase
2. Verify cron job is running (check `/var/log/meoris-cron.log`)
3. Run diagnostic: `node diagnose_and_fix_auto_cancel.js`
4. Share error logs for debugging

## 📁 RELATED FILES

- `update_deadline_to_11_30.js` - Script untuk set deadline (already run ✅)
- `verify_order_DEV-T44456309544KBIRG.js` - Check order status
- `monitor_auto_cancel_test.js` - Auto monitoring script
- `APPLY_THIS_SQL_FIX.sql` - Database fix (already applied ✅)

---

**🎯 READY TO TEST!**

Run this command to start monitoring:
```bash
node monitor_auto_cancel_test.js
```

Wait for 11:30 WIB and watch the magic happen! 🪄
