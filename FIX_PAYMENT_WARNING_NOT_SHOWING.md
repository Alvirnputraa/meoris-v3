# Fix: Payment Deadline Warning Not Showing

## 🐛 Problem

Payment deadline warning tidak muncul di halaman order detail untuk pesanan dengan status pending.

**URL**: `http://localhost:3000/user/purchase?view=order-detail&order=DEV-T44456309143I0VOZ`

**Expected**: Warning box kuning dengan batas waktu pembayaran
**Actual**: Warning tidak muncul sama sekali

## 🔍 Root Cause

### Issue 1: Wrong Component Location

Warning awalnya ditambahkan di file yang salah:
- ❌ **Added to**: `src/app/produk/pesanan/[orderId]/OrderDetailClient.tsx`
- ✅ **Should be in**: `src/app/user/purchase/page.tsx`

Halaman `/user/purchase?view=order-detail` menggunakan component dari `page.tsx`, BUKAN dari `OrderDetailClient.tsx`.

### Issue 2: Wrong Conditional Block

Ada warning yang sudah exist di `page.tsx` tapi di tempat yang salah:
- **Location**: Line 5848-5893 (before fix)
- **Problem**: Warning ada di dalam `activeTimelineStep === 'replacement'` block
- **Impact**: Warning hanya muncul jika ada return dengan replacement (tidak logis untuk pending orders!)

## ✅ Solution

### Fix 1: Added Warning to Correct Component

**File**: `src/app/user/purchase/page.tsx`
**Line**: 6450-6495 (after fix)
**Location**: Di dalam Order Detail Card section, setelah Order Info dan sebelum Shipping Deadline warning

### Fix 2: Removed Misplaced Warning

**Removed from**: Line 5848-5893 (replacement timeline section)
**Reason**: Pending orders tidak akan punya return timeline

## 📝 Implementation Details

### Component Structure

```
src/app/user/purchase/page.tsx
  └─ activeView === 'order-detail'
      └─ showUpdateSize ? (Update Size Form)
      └─ showReturnDetail ? (Return Detail with Timeline)
      └─ !showReturnForm ? (Order Detail Card) ✅ WARNING HERE
      └─ else (Return Form)
```

### Warning Code

```tsx
{/* Payment Deadline Warning - Only for PENDING orders */}
{(selectedOrder.status === 'pending' || selectedOrder.status === 'belum bayar') && selectedOrder.created_at && (() => {
  // Calculate payment deadline: created_at + 24 hours, rounded UP to next hour
  const createdAt = new Date(selectedOrder.created_at);
  let deadline = new Date(createdAt.getTime() + (24 * 60 * 60 * 1000));

  // Round UP to next hour (:00) because cron runs every hour at :00
  if (deadline.getMinutes() > 0 || deadline.getSeconds() > 0) {
    deadline.setHours(deadline.getHours() + 1);
  }
  deadline.setMinutes(0);
  deadline.setSeconds(0);
  deadline.setMilliseconds(0);

  const paymentDeadline = deadline.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) + ' pukul ' + deadline.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
      <div className="flex gap-3">
        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-yellow-800">
            Selesaikan pembayaran Anda
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            Batas waktu pembayaran Anda sampai <span className="font-semibold">{paymentDeadline}</span>
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Pesanan akan dibatalkan otomatis jika tidak dibayar sebelum batas waktu.
          </p>
        </div>
      </div>
    </div>
  );
})()}
```

### Placement

Warning ditempatkan setelah Order Info dan sebelum warnings lainnya:

```tsx
<div className="space-y-4">
  {/* Order Info */}
  <div className="bg-gray-50 rounded p-3">
    {/* ... order details ... */}
  </div>

  {/* Payment Deadline Warning - ADDED HERE */}
  {/* ... warning code ... */}

  {/* Shipping Deadline Info */}
  {/* ... */}

  {/* Delivered Warning */}
  {/* ... */}
</div>
```

## 🎯 Result

### Before Fix
```
❌ Warning tidak muncul sama sekali
❌ User tidak tahu batas waktu pembayaran
```

### After Fix
```
✅ Warning muncul dengan styling yellow
✅ Menampilkan deadline: "17 November 2025 pukul 21:00"
✅ User mendapat peringatan untuk menyelesaikan pembayaran
```

## 🧪 Testing

### Test URL
```
http://localhost:3000/user/purchase?view=order-detail&order=DEV-T44456309143I0VOZ
```

### Expected Result

**Warning Box:**
```
┌─────────────────────────────────────────────────────┐
│  🕐 Selesaikan pembayaran Anda                      │
│                                                     │
│  Batas waktu pembayaran Anda sampai                │
│  17 November 2025 pukul 21:00                      │
│                                                     │
│  Pesanan akan dibatalkan otomatis jika tidak       │
│  dibayar sebelum batas waktu.                      │
└─────────────────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-yellow-50`
- Border: `border-yellow-300`
- Icon: Clock (⏰) in `text-yellow-600`
- Text: Various shades of yellow

### Verification Steps

1. ✅ Open URL with pending order ID
2. ✅ Verify warning appears in Order Detail Card
3. ✅ Check yellow styling is applied
4. ✅ Verify deadline calculation is correct (created_at + 24 hours, rounded up)
5. ✅ Verify warning doesn't appear for paid/shipped/delivered orders

## 📊 Conditions

Warning will show when ALL conditions are met:

1. ✅ `activeView === 'order-detail'`
2. ✅ `!showReturnForm && !showReturnDetail && !showUpdateSize`
3. ✅ `selectedOrder.status === 'pending' OR 'belum bayar'`
4. ✅ `selectedOrder.created_at` exists

## 🔗 Related Files

### Modified Files
- `src/app/user/purchase/page.tsx` (lines 6450-6495)
  - Added payment deadline warning
  - Removed misplaced warning from replacement section

### Related Files (No Changes)
- `src/app/produk/pesanan/[orderId]/OrderDetailClient.tsx`
  - Warning added here (lines 935-1039) but NOT used by /user/purchase page
  - Keep for other routes that may use this component

### Documentation
- `PAYMENT_DEADLINE_WARNING_IMPLEMENTATION.md` - Feature documentation
- `FIX_PAYMENT_REFERENCE_ORDER_LOADING.md` - Fix for 400 error
- `AUTO_CANCEL_PENDING_ORDERS_SETUP.md` - Auto-cancel system

## 💡 Lessons Learned

### 1. Component Routing
Different routes may use different components even for similar functionality:
- `/produk/pesanan/[orderId]` → Uses `OrderDetailClient.tsx`
- `/user/purchase?view=order-detail` → Uses `page.tsx`

**Lesson**: Always verify which component is actually rendered for a given URL.

### 2. Conditional Rendering
Complex conditional rendering can hide components:
```tsx
showA ? <A /> : showB ? <B /> : showC ? <C /> : <D />
```

**Lesson**: Understand the full conditional chain before placing components.

### 3. Timeline Logic
Timeline steps (review, return, shipping, validation, replacement) are only for return flows.

**Lesson**: Don't place general order warnings inside timeline-specific blocks.

## ⚠️ Important Notes

### Why Two Implementations?

Warning exists in both files because they serve different routes:

1. **`page.tsx`** (line 6450-6495)
   - For: `/user/purchase?view=order-detail&order=XXX`
   - Used in main purchase page

2. **`OrderDetailClient.tsx`** (line 935-1039)
   - For: `/produk/pesanan/[orderId]`
   - Used in product order detail page

Both are needed and should be maintained.

### Future Improvements

Consider creating a shared `<PaymentDeadlineWarning>` component to avoid duplication:

```tsx
// components/PaymentDeadlineWarning.tsx
export function PaymentDeadlineWarning({ order }) {
  // ... logic ...
  return <div>...</div>
}

// Usage in both files:
<PaymentDeadlineWarning order={selectedOrder} />
```

---

Fix completed successfully! 🎉

Warning sekarang muncul di tempat yang benar untuk pending orders.
