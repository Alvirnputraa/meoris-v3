# Cancelled Order Feature - Implementation Summary

Fitur untuk menampilkan badge "Dibatalkan" dan warning khusus untuk pesanan yang dibatalkan otomatis oleh sistem.

## 📋 Overview

### Feature 1: Badge "Dibatalkan" di List Pesanan
Ketika order auto-cancelled oleh cron job, status badge akan menampilkan "Dibatalkan" dengan warna merah di halaman list pesanan.

### Feature 2: Warning Merah di Detail Pesanan
Ketika user membuka detail pesanan yang sudah dibatalkan, akan muncul warning box merah yang menjelaskan bahwa pesanan telah dibatalkan otomatis.

## ✅ Implementation

### 1. Updated Status Functions

**File**: `src/app/user/purchase/page.tsx`

#### getStatusText (Line 3281-3302)
```typescript
const getStatusText = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'unpaid':
    case 'pending':
      return 'Belum Bayar';
    case 'paid':
      return 'Sedang dikemas';
    case 'processing':
      return 'Sedang dikemas';
    case 'shipped':
      return 'Dikirim';
    case 'delivered':
    case 'completed':
      return 'Selesai';
    case 'cancelled':
      return 'Dibatalkan';  // ✅ NEW
    case 'failed':
      return 'Gagal';
    default:
      return status || 'Pending';
  }
};
```

#### getStatusColor (Line 3236-3256)
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'UNPAID':
    case 'pending':
      return 'text-yellow-600';
    case 'PAID':
      return 'text-green-600';
    case 'FAILED':
    case 'cancelled':  // ✅ NEW
      return 'text-red-600';
    case 'processing':
      return 'text-blue-600';
    case 'shipped':
      return 'text-purple-600';
    case 'delivered':
    case 'completed':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
};
```

### 2. Updated loadOrders Function

**File**: `src/app/user/purchase/page.tsx`
**Line**: 1848-1854

```typescript
// Load pending checkouts (submitted but not yet paid, and cancelled orders)
const { data: pendingCheckouts, error: checkoutError } = await supabase
  .from('checkout_submissions')
  .select('*')
  .eq('user_id', user.id)
  .in('status', ['submitted', 'cancelled'])  // ✅ Include cancelled
  .order('created_at', { ascending: false });
```

**Line**: 1885

```typescript
status: checkout.status === 'submitted' ? 'pending' : checkout.status, // ✅ Use actual status for cancelled
```

### 3. Updated Order Detail Loading

**File**: `src/app/user/purchase/page.tsx`
**Line**: 1099

```typescript
status: checkoutData.status === 'submitted' ? 'pending' : checkoutData.status, // ✅ Use actual status for cancelled
```

### 4. Added Cancelled Warning in Order Detail

**File**: `src/app/user/purchase/page.tsx`
**Line**: 6412-6429

```typescript
{/* Cancelled Order Warning - Only for CANCELLED orders */}
{(selectedOrder.status === 'cancelled' || selectedOrder.status === 'failed') && (
  <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
    <div className="flex gap-3">
      <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">
          Pesanan dibatalkan
        </p>
        <p className="text-sm text-red-700 mt-1">
          Pesanan Anda telah dibatalkan otomatis oleh sistem.
        </p>
      </div>
    </div>
  </div>
)}
```

## 🎨 UI/UX Design

### Badge Status di List Pesanan

**Before**:
```
Status: Gagal (untuk cancelled)
Color: text-gray-600
```

**After**:
```
Status: Dibatalkan (khusus untuk cancelled)
Color: text-red-600
```

### Warning di Detail Pesanan

**Design**:
- **Background**: Red-50 (soft red)
- **Border**: Red-300
- **Icon**: X in circle (❌) in red-600
- **Text**: Red-800 (heading), Red-700 (body)

**Content**:
```
┌────────────────────────────────────────────┐
│  ❌ Pesanan dibatalkan                     │
│                                            │
│  Pesanan Anda telah dibatalkan otomatis    │
│  oleh sistem.                              │
└────────────────────────────────────────────┘
```

## 🔄 Flow Integration

### Auto-Cancel Flow

```
Order Created (status: pending)
    ↓
Payment not received within 24 hours
    ↓
Cron job runs (auto_cancel_pending_orders)
    ↓
Status changed to 'cancelled'
    ↓
Notification sent to user
    ↓
UI updates:
  - List: Badge "Dibatalkan" (red)
  - Detail: Warning box "Pesanan dibatalkan" (red)
```

### Tab Filtering

Cancelled orders appear in:
- **All tab**: Yes
- **Cancelled tab**: Yes
- **Unpaid tab**: No
- **Other tabs**: No

**Code** (Line 2250-2254):
```typescript
case 'cancelled':
  return userOrders.filter(order =>
    order.status === 'cancelled' ||
    order.status === 'failed'
  );
```

## 🧪 Testing

### Test Script

Created: `test_cancel_order.js`

```bash
node test_cancel_order.js
```

This script:
1. Updates order status to 'cancelled'
2. Provides test URLs
3. Shows expected results

### Manual Testing Steps

#### Test 1: List Pesanan
1. Navigate to: `http://localhost:3000/user/purchase?pesanan-saya=all`
2. Find cancelled order
3. Verify badge shows "Dibatalkan" in red (`text-red-600`)

#### Test 2: Detail Pesanan
1. Navigate to: `http://localhost:3000/user/purchase?view=order-detail&order=DEV-T44456309143I0VOZ`
2. Verify red warning box appears
3. Check text: "Pesanan dibatalkan - Pesanan Anda telah dibatalkan otomatis oleh sistem"

#### Test 3: Tab Filtering
1. Go to "Semua" tab → Order appears
2. Go to "Dibatalkan" tab → Order appears
3. Go to "Belum Bayar" tab → Order does NOT appear

## 📊 Conditions

### Badge "Dibatalkan" Shows When:
- `order.status === 'cancelled'`
- In list view (purchase page)

### Warning Red Box Shows When:
- `selectedOrder.status === 'cancelled'` OR `selectedOrder.status === 'failed'`
- In order detail view

### Payment Deadline Warning Does NOT Show When:
- `status === 'cancelled'`
- Only shows for `status === 'pending' || status === 'belum bayar'`

## 🔗 Related Files

### Modified Files
1. `src/app/user/purchase/page.tsx`
   - Line 3236-3256: `getStatusColor` function
   - Line 3281-3302: `getStatusText` function
   - Line 1848-1854: Load cancelled checkouts
   - Line 1885: Use actual status for pseudo-orders
   - Line 1099: Use actual status for order detail
   - Line 6412-6429: Cancelled warning component

### Test Files
- `test_cancel_order.js` - Script to test cancelled order

### Documentation
- `CANCELLED_ORDER_FEATURE.md` - This file
- `AUTO_CANCEL_PENDING_ORDERS_SETUP.md` - Auto-cancel system setup
- `PAYMENT_DEADLINE_WARNING_IMPLEMENTATION.md` - Payment warning feature

## 💡 Key Improvements

### 1. Clear Status Distinction
- **Before**: Cancelled and Failed both showed "Gagal"
- **After**: Cancelled shows "Dibatalkan", Failed shows "Gagal"

### 2. User-Friendly Messaging
- Clear explanation that system auto-cancelled the order
- No confusing technical terms
- Red color indicates error/cancelled state

### 3. Consistent UI
- Badge color matches warning color (both red)
- Icon usage consistent across app
- Text hierarchy: semibold heading + normal body

## 🎯 Success Criteria

✅ Badge "Dibatalkan" appears in list for cancelled orders
✅ Badge color is red (`text-red-600`)
✅ Warning box appears in detail for cancelled orders
✅ Warning box is red theme (bg-red-50, border-red-300)
✅ Text explains auto-cancellation by system
✅ Payment deadline warning does NOT show for cancelled orders
✅ Cancelled orders appear in "Dibatalkan" tab
✅ Cancelled orders load correctly from checkout_submissions

## ⚠️ Important Notes

### Status Mapping

| checkout_submissions.status | pseudo-order.status | Badge Text | Color |
|-----------------------------|---------------------|------------|-------|
| submitted | pending | Belum Bayar | Yellow |
| cancelled | cancelled | Dibatalkan | Red |

### Why Two Locations?

Cancelled orders can exist in two tables:

1. **checkout_submissions** (status: 'cancelled')
   - Orders that were cancelled before payment
   - Loaded as pseudo-orders in list view

2. **orders** (status: 'cancelled')
   - Orders that were cancelled after payment
   - Real orders in orders table

Both are handled correctly by the implementation.

## 🚀 Deployment Checklist

- [x] Update getStatusText function
- [x] Update getStatusColor function
- [x] Update loadOrders to include cancelled status
- [x] Update pseudo-order status mapping
- [x] Add cancelled warning component
- [x] Test badge in list view
- [x] Test warning in detail view
- [x] Test tab filtering
- [ ] Deploy to production
- [ ] Monitor for cancelled orders
- [ ] Verify notifications are sent

---

Implementation completed successfully! 🎉

Users will now see clear "Dibatalkan" badge and warning for auto-cancelled orders.
