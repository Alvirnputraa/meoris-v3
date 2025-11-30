# 📢 Sistem Notifikasi Lengkap - Shipped & Delivered

## 🎯 Overview

Implementasi lengkap sistem notifikasi untuk:
1. **Pesanan Dikirim** (Shipped) - Ketika admin generate resi
2. **Pesanan Terkirim** (Delivered) - Ketika pesanan sampai ke customer

---

## 📊 Comparison Table

| Aspect | SHIPPED Notification | DELIVERED Notification |
|--------|---------------------|------------------------|
| **Trigger** | Status: paid/processing → shipped | Status: shipped → delivered |
| **Title** | "Pesanan Dikirim" | "Pesanan Terkirim" |
| **Icon** | 🚚 Truck | ✓ Checkmark Circle |
| **Color** | Purple (bg-purple-100) | Green (bg-green-100) |
| **Message** | "...telah dikirim ke pihak ekspedisi" | "...telah terkirim. Pesanan akan terselesaikan otomatis pada [DATE]" |
| **Extra Info** | - | Auto-complete date + time |
| **Requires** | `status` change | `status` + `delivered_at` change |
| **Type** | 'order_shipped' | 'order_delivered' |

---

## 🎨 Visual Preview

### 1. Shipped Notification
```
┌────────────────────────────────────────────────┐
│  🚚  Pesanan Dikirim                          │
│  🟣  Pesanan anda dengan id pesanan           │
│      1A2B3C4D5E telah dikirim ke pihak       │
│      ekspedisi                                │
│      12 Jan 2025, 14:30 • Lihat Pesanan      │
└────────────────────────────────────────────────┘
```

### 2. Delivered Notification
```
┌────────────────────────────────────────────────┐
│  ✓   Pesanan Terkirim                         │
│  🟢  Pesanan anda dengan id pesanan           │
│      1A2B3C4D5E telah terkirim. Pesanan akan  │
│      terselesaikan otomatis pada 14 Januari   │
│      2025 pukul 15:30                         │
│      12 Jan 2025, 14:30 • Lihat Pesanan       │
└────────────────────────────────────────────────┘
```

---

## 🚀 Complete Setup Guide

### Step 1: Setup Shipped Notification

**File**: `create_notification_on_shipped.sql`

```bash
# Via Supabase Dashboard SQL Editor
# Copy & paste dari create_notification_on_shipped.sql
# Run SQL
```

**Trigger Name**: `trigger_notification_on_order_shipped`

**When**: Order status changes from 'paid' or 'processing' to 'shipped'

---

### Step 2: Setup Delivered Notification

**File**: `create_notification_on_delivered.sql`

```bash
# Via Supabase Dashboard SQL Editor
# Copy & paste dari create_notification_on_delivered.sql
# Run SQL
```

**Trigger Name**: `trigger_notification_on_order_delivered`

**When**: Order status changes from 'shipped' to 'delivered' (with delivered_at set)

---

### Step 3: Verify Both Triggers

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_notification_on_order_shipped',
  'trigger_notification_on_order_delivered'
)
ORDER BY trigger_name;
```

**Expected Result**: 2 rows

---

## 🎯 Complete User Journey

```
1. User bayar pesanan
   ↓
   Notif: "Pembayaran Berhasil" (existing)

2. Admin generate resi
   Status: paid → shipped
   ↓
   Notif: "Pesanan Dikirim"
   Message: "...telah dikirim ke pihak ekspedisi"

3. Kurir deliver pesanan
   Status: shipped → delivered
   delivered_at: NOW()
   ↓
   Notif: "Pesanan Terkirim"
   Message: "...telah terkirim. Pesanan akan terselesaikan
            otomatis pada 14 Januari 2025 pukul 15:30"

4. Auto-complete (2 hari kemudian)
   Status: delivered → completed
   ↓
   (Optional: Add completion notification)
```

---

## 📁 File Structure

```
project/
├── create_notification_on_shipped.sql      # SQL untuk shipped trigger
├── create_notification_on_delivered.sql    # SQL untuk delivered trigger
├── test_shipped_notification.js            # Test script shipped
├── test_delivered_notification.js          # Test script delivered
├── SHIPPED_NOTIFICATION_IMPLEMENTATION.md  # Docs shipped (full)
├── QUICK_SETUP_SHIPPED_NOTIFICATION.md     # Docs shipped (quick)
├── DELIVERED_NOTIFICATION_SETUP.md         # Docs delivered
├── NOTIFICATION_FIXES_SUMMARY.md           # Summary fixes
└── COMPLETE_NOTIFICATION_SYSTEM_SUMMARY.md # This file
```

---

## 🧪 Testing Both Notifications

### Full Flow Test

```bash
# 1. Test shipped notification
node test_shipped_notification.js

# 2. Test delivered notification
node test_delivered_notification.js
```

### Manual Full Flow Test

```sql
-- 1. Cari order dengan status paid
SELECT id, order_number, status FROM orders
WHERE status = 'paid' LIMIT 1;

-- 2. Update ke shipped
UPDATE orders
SET status = 'shipped'
WHERE id = '<order-id>';

-- 3. Cek notif shipped dibuat
SELECT * FROM notifications
WHERE order_id = '<order-id>' AND type = 'order_shipped';

-- 4. Update ke delivered
UPDATE orders
SET status = 'delivered',
    delivered_at = NOW()
WHERE id = '<order-id>';

-- 5. Cek notif delivered dibuat
SELECT * FROM notifications
WHERE order_id = '<order-id>' AND type = 'order_delivered';

-- 6. Cek semua notif untuk order ini
SELECT type, title, message, created_at
FROM notifications
WHERE order_id = '<order-id>'
ORDER BY created_at DESC;
```

---

## 🎨 UI Implementation

**File**: `src/app/user/purchase/page.tsx`

### Icon Mapping (lines 6032-6065)

```tsx
{notif.type === 'order_shipped' ? (
  <svg className="text-purple-600">
    {/* Truck icon */}
  </svg>
) : notif.type === 'order_delivered' ? (
  <svg className="text-green-600">
    {/* Checkmark circle icon */}
  </svg>
) : ...}
```

### Background Colors

```tsx
notif.type === 'order_shipped' ? 'bg-purple-100'
notif.type === 'order_delivered' ? 'bg-green-100'
```

---

## 📊 Database Schema

### notifications Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to auth.users |
| `order_id` | UUID | FK to orders |
| `type` | VARCHAR(50) | 'order_shipped' or 'order_delivered' |
| `title` | VARCHAR(255) | Notification title |
| `message` | TEXT | Full message with details |
| `is_read` | BOOLEAN | Read status (default: false) |
| `created_at` | TIMESTAMPTZ | Timestamp |

### orders Table (Required Fields)

| Column | Type | Notes |
|--------|------|-------|
| `status` | VARCHAR | 'paid', 'processing', 'shipped', 'delivered', etc. |
| `delivered_at` | TIMESTAMPTZ | Set when status = 'delivered' |

---

## 🔄 Data Flow

### Shipped Notification

```
Admin clicks "Generate Resi"
    ↓
API: /api/admin/generate-resi
    ↓
Biteship API creates shipment
    ↓
Update: status = 'shipped', shipping_resi = <waybill>
    ↓
Trigger: trigger_notification_on_order_shipped
    ↓
Function: create_notification_on_order_shipped()
    ↓
Calculate: order_id_display (10 chars)
    ↓
INSERT notification (type: 'order_shipped')
    ↓
User sees in: /user/purchase?view=notifications
```

### Delivered Notification

```
Biteship Webhook / Manual Update
    ↓
Update: status = 'delivered', delivered_at = NOW()
    ↓
Trigger: trigger_notification_on_order_delivered
    ↓
Function: create_notification_on_order_delivered()
    ↓
Calculate: auto_complete = delivered_at + 2 days
Format: "DD Month YYYY pukul HH:MM"
    ↓
INSERT notification (type: 'order_delivered')
    ↓
User sees in: /user/purchase?view=notifications
```

---

## ✅ Complete Testing Checklist

### Shipped Notification
- [ ] Setup SQL trigger
- [ ] Verify trigger exists
- [ ] Test generate resi via admin panel
- [ ] Verify notification created
- [ ] Check icon: Purple truck
- [ ] Check message: "...telah dikirim ke pihak ekspedisi"
- [ ] Check order ID format: 10 uppercase chars

### Delivered Notification
- [ ] Setup SQL trigger
- [ ] Verify trigger exists
- [ ] Test status update to delivered
- [ ] Verify `delivered_at` is set
- [ ] Verify notification created
- [ ] Check icon: Green checkmark circle
- [ ] Check message includes auto-complete date
- [ ] Check date format: "DD Month YYYY pukul HH:MM"
- [ ] Check order ID format: 10 uppercase chars

### End-to-End
- [ ] Test full flow: paid → shipped → delivered
- [ ] Verify 2 notifications created
- [ ] Check notification order (newest first)
- [ ] Test "Lihat Pesanan" link
- [ ] Test on mobile view
- [ ] Test with multiple users
- [ ] Verify RLS policies work

---

## 🔍 Common Issues & Solutions

### Issue 1: Notifikasi tidak muncul

**Possible Causes:**
- Trigger belum dibuat
- RLS policy blocking
- `delivered_at` not set (for delivered notif)

**Solution:**
```sql
-- Check triggers
SELECT * FROM information_schema.triggers
WHERE trigger_name LIKE '%notification%';

-- Check RLS
SELECT tablename, policyname FROM pg_policies
WHERE tablename = 'notifications';

-- Check delivered_at
SELECT id, status, delivered_at FROM orders
WHERE status = 'delivered';
```

---

### Issue 2: Format waktu salah

**For Delivered Notification:**

Make sure `delivered_at` is a valid TIMESTAMPTZ:
```sql
SELECT delivered_at, delivered_at + INTERVAL '2 days' as auto_complete
FROM orders
WHERE status = 'delivered';
```

---

### Issue 3: Order ID tidak match dengan list

**Check Format:**
```sql
-- Should be 10 uppercase chars without dashes
SELECT
  id,
  UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 10)) as display_id
FROM orders
LIMIT 5;
```

---

## 📚 Documentation Links

- **Shipped Notification (Full)**: `SHIPPED_NOTIFICATION_IMPLEMENTATION.md`
- **Shipped Notification (Quick)**: `QUICK_SETUP_SHIPPED_NOTIFICATION.md`
- **Delivered Notification**: `DELIVERED_NOTIFICATION_SETUP.md`
- **Fixes Summary**: `NOTIFICATION_FIXES_SUMMARY.md`

---

## 🚀 Deployment Checklist

### Database
- [ ] Run `create_notification_on_shipped.sql` in production
- [ ] Run `create_notification_on_delivered.sql` in production
- [ ] Verify both triggers created
- [ ] Test with production data

### Frontend
- [ ] Deploy updated `src/app/user/purchase/page.tsx`
- [ ] Test notification icons in production
- [ ] Test responsive design
- [ ] Clear browser cache

### Testing
- [ ] Test shipped notification in production
- [ ] Test delivered notification in production
- [ ] Test with real user accounts
- [ ] Verify email notifications (if enabled)

---

## 🎉 Success Criteria

System is working correctly when:

✅ Admin can generate resi → User gets "Pesanan Dikirim" notification
✅ Order becomes delivered → User gets "Pesanan Terkirim" notification
✅ Both notifications show correct icons (truck & checkmark)
✅ Order ID format matches list view (10 uppercase chars)
✅ Delivered notification shows auto-complete date with time
✅ "Lihat Pesanan" link works correctly
✅ Notifications visible in `/user/purchase?view=notifications`
✅ No duplicate notifications
✅ Works across all devices (mobile, tablet, desktop)

---

**Last Updated**: 2025-01-12
**Version**: 1.0.0
**Status**: ✅ Complete & Ready to Deploy
