# Completed Order Notification Setup

## Overview
This document explains how to set up and test the notification system that triggers when an order is automatically completed (status changes from 'delivered' to 'completed').

## Notification Details
- **Trigger**: Order status changes from 'delivered' to 'completed'
- **Title**: "Pesanan Terselesaikan"
- **Message**: "Pesanan anda dengan id pesanan [10-CHAR-ID] telah terselesaikan"
- **Icon**: Blue checkmark with document/clipboard icon
- **Background**: Blue (bg-blue-100)

## Setup Instructions

### Step 1: Deploy SQL Trigger to Supabase

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `create_notification_on_completed.sql`
4. Click **Run** to execute

The script will:
- Drop existing function (if any)
- Create `create_notification_on_order_completed()` function
- Create trigger `trigger_notification_on_order_completed` on `orders` table
- Grant necessary permissions
- Verify trigger was created

### Step 2: Restart Development Server

The UI changes have been made to `src/app/user/purchase/page.tsx`. To see the blue completed notification icon:

```bash
# Stop the dev server (Ctrl+C)
# Delete Next.js cache
rm -rf .next
# or on Windows:
# rmdir /s /q .next

# Restart the server
npm run dev
```

### Step 3: Clear Browser Cache

In your browser:
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
4. Or use Ctrl+Shift+R (Cmd+Shift+R on Mac)

## Testing

### Option 1: Automated Test Script

Run the test script to verify the completed notification system:

```bash
node test_completed_notification.js
```

The script will:
1. Find a test order with status 'delivered'
2. Count existing notifications for that order
3. Update order status to 'completed'
4. Wait for trigger to fire
5. Verify new notification was created
6. Check notification content accuracy

Expected output:
```
✅ SUCCESS! New notification created:
   Type: order_completed
   Title: Pesanan Terselesaikan
   Message: Pesanan anda dengan id pesanan DEV1234567890 telah terselesaikan

🎉 ALL TESTS PASSED! Completed notification system is working correctly!
```

### Option 2: Manual Testing via Supabase Dashboard

1. Find a delivered order:
```sql
SELECT id, order_number, status, user_id, delivered_at
FROM orders
WHERE status = 'delivered'
LIMIT 1;
```

2. Update status to 'completed':
```sql
UPDATE orders
SET status = 'completed'
WHERE id = '<order-id-from-step-1>';
```

3. Check for new notification:
```sql
SELECT *
FROM notifications
WHERE order_id = '<order-id-from-step-1>'
  AND type = 'order_completed'
ORDER BY created_at DESC;
```

### Option 3: Test Complete Order Flow

Test all three notifications in sequence:

1. **Shipped Notification**: Update order to 'shipped'
```sql
UPDATE orders SET status = 'shipped' WHERE id = '<order-id>';
```
Expected: "Pesanan Dikirim" notification with purple truck icon

2. **Delivered Notification**: Update to 'delivered' with timestamp
```sql
UPDATE orders
SET status = 'delivered',
    delivered_at = NOW()
WHERE id = '<order-id>';
```
Expected: "Pesanan Terkirim" notification with green checkmark icon

3. **Completed Notification**: Update to 'completed' (or wait for cron job)
```sql
UPDATE orders SET status = 'completed' WHERE id = '<order-id>';
```
Expected: "Pesanan Terselesaikan" notification with blue document checkmark icon

## Verification Checklist

After setup, verify the following:

- [ ] SQL trigger exists in Supabase database
- [ ] Function `create_notification_on_order_completed()` exists
- [ ] Trigger `trigger_notification_on_order_completed` exists
- [ ] Dev server restarted and cache cleared
- [ ] Test script passes all checks
- [ ] Notification appears in UI at `/user/purchase?view=notifications`
- [ ] Notification has correct icon (blue document checkmark)
- [ ] Notification has correct message format
- [ ] Order ID format matches (10 uppercase chars without dashes)
- [ ] Notification is linked to correct order_id and user_id

## UI Integration

The completed notification icon was added to `src/app/user/purchase/page.tsx`:

**Icon Background** (around line 6040):
```typescript
: notif.type === 'order_completed' ? 'bg-blue-100'
```

**Icon SVG** (around line 6070):
```typescript
: notif.type === 'order_completed' ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-600">
    <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
```

## Troubleshooting

### Notification not appearing?

1. **Check trigger exists**:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_completed';
```

2. **Check function exists**:
```sql
SELECT * FROM pg_proc WHERE proname = 'create_notification_on_order_completed';
```

3. **Verify order status changed**:
```sql
SELECT id, status, user_id, delivered_at, updated_at
FROM orders
WHERE id = '<order-id>';
```

4. **Check RLS policies**:
```sql
-- Make sure user can SELECT their own notifications
SELECT * FROM notifications WHERE user_id = '<user-id>';
```

### UI icon not showing?

1. Restart dev server
2. Delete `.next` folder
3. Hard refresh browser (Ctrl+Shift+R)
4. Check browser console for errors
5. Verify notification type is exactly 'order_completed' (no typos)

## Auto-Complete Integration

This notification works with the auto-complete cron job that runs every hour at :00. When the cron job changes a delivered order to completed (after 2 days), this notification will be automatically created.

The auto-complete time shown in the "delivered" notification is already rounded up to the next hour to match the cron schedule.

## Complete Notification Flow

1. **Order Created** → Yellow document icon
2. **Payment Success** → Green checkmark in circle icon
3. **Order Shipped** → Purple truck icon
4. **Order Delivered** → Green checkmark in circle icon (with auto-complete date)
5. **Order Completed** → Blue document checkmark icon

All notifications appear at: `http://localhost:3000/user/purchase?view=notifications`

## Files Involved

- `create_notification_on_completed.sql` - SQL trigger and function
- `test_completed_notification.js` - Automated test script
- `src/app/user/purchase/page.tsx` - UI with completed notification icon
- `COMPLETED_NOTIFICATION_SETUP.md` - This documentation file

## Related Documentation

- `NOTIFICATION_SYSTEM_FINAL_FIX.md` - Complete notification system overview
- `FIX_AUTOCOMPLETE_TIME_ROUND_UP.sql` - Time rounding logic for delivered notification
- `SETUP_NOTIFICATIONS.md` - General notification setup guide
