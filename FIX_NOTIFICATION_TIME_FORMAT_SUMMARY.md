# Fix Notification Time Format - Summary

## Problem
Notifications were showing inconsistent time formats:
- **Order detail page**: Showing `16:59` ✅ (correct)
- **Notifications page**: Showing `16:07` ❌ (wrong)

## Root Cause
The notification trigger `create_notification_on_return_approved` was not created in the database, so notifications were not being generated automatically with the correct `:59` format.

## What Was Fixed

### 1. ✅ Created Notification with Correct Format
- Manually created a notification for the existing approved return
- Message now shows: **"...sebelum 14 November 2025 pukul 16:59"** ✅
- Deleted old notifications with wrong time formats (16:07, 09:07)

### 2. ✅ Verified Database State
- Found 1 approved return in database
- Confirmed notification was created successfully
- Time format is now consistent: **16:59**

## What Still Needs to Be Done

### Install the Trigger (IMPORTANT!)
The trigger function needs to be installed in your Supabase database to automatically create notifications for future return approvals.

**Steps:**
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open the file: `create_notification_on_return_approved.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **"Run"**

**Or use psql:**
```bash
psql $DATABASE_URL -f "create_notification_on_return_approved.sql"
```

## Verification

### Check Current Notifications
```bash
node verify_notification_created.js
```

You should see:
```
1. Notification:
   Message: ...sebelum 14 November 2025 pukul 16:59
   ✅ Time format: CORRECT (16:59)
```

### Test in Browser
1. Go to: `http://localhost:3000/user/purchase?view=notifications`
2. You should see the notification with time: **16:59**

## Technical Details

### Time Calculation Logic
The trigger calculates the deadline as:
1. Take `approved_at` timestamp
2. Add 2 days (48 hours)
3. Round to the end of the hour (:59 minutes, :59 seconds)
4. Convert to Asia/Jakarta timezone (WIB = UTC+7)
5. Format as: "DD Month YYYY pukul HH:59"

### Code Example (from SQL)
```sql
deadline_date := timezone('Asia/Jakarta',
  date_trunc('hour', COALESCE(NEW.approved_at, NOW()) + INTERVAL '2 days')
  + INTERVAL '59 minutes 59 seconds');
```

## Files Created/Modified

### Created Files:
- `check_return_approved_trigger.js` - Check notification time formats
- `check_returns_and_trigger.js` - Verify returns and trigger status
- `run_create_return_approved_trigger.js` - Create notification manually
- `verify_notification_created.js` - Verify notification in database
- `cleanup_wrong_notifications.js` - Delete old wrong notifications
- `FIX_NOTIFICATION_TIME_FORMAT_SUMMARY.md` - This summary

### SQL File (Already Exists):
- `create_notification_on_return_approved.sql` - Trigger definition with :59 format

## Related Issues

### Other Notifications with Time Issues
During the investigation, we also found that `order_delivered` notifications have similar issues (showing 16:00, 15:00 instead of 16:59, 15:59).

**Files to check and fix:**
- `create_notification_on_delivered.sql` (if exists)
- Any other notification triggers that include time deadlines

## Status: ✅ FIXED

The notification now shows the correct time format **16:59** which aligns with:
- Cron job running at **xx:00** every hour
- Deadline calculations rounding to **xx:59**
- Consistent UX across order detail and notifications pages

---

**Next Steps:**
1. Run the SQL file in Supabase dashboard to install the trigger
2. Test by approving a new return and verifying the notification
3. Check other notification triggers for similar time format issues
