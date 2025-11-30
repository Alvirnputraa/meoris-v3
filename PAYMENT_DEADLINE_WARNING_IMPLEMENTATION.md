# Payment Deadline Warning - Implementation Summary

Implementasi label peringatan batas waktu pembayaran untuk pesanan dengan status pending/belum bayar.

## 📋 Overview

Ketika user membuka halaman detail pesanan dengan status `pending` atau `belum bayar`, akan muncul warning box yang menampilkan:
- Batas waktu pembayaran (deadline)
- Pesan bahwa pesanan akan dibatalkan otomatis jika tidak dibayar

## ✅ Implementation

### File Modified
- **File**: `src/app/produk/pesanan/[orderId]/OrderDetailClient.tsx`
- **Lines**: 935-1039

### Changes Made

#### 1. Added Payment Deadline Calculation
```typescript
const isPending = orderMeta?.status === 'pending' || orderMeta?.status === 'belum bayar'
const createdAt = orderMeta?.created_at

// Calculate payment deadline for pending orders (24 hours from created_at)
let paymentDeadline = null
if (isPending && createdAt) {
  const created = new Date(createdAt)
  let deadline = new Date(created.getTime() + (24 * 60 * 60 * 1000)) // Add 24 hours

  // Round UP to next hour (:00) because cron runs every hour at :00
  if (deadline.getMinutes() > 0 || deadline.getSeconds() > 0) {
    deadline.setHours(deadline.getHours() + 1)
  }
  deadline.setMinutes(0)
  deadline.setSeconds(0)
  deadline.setMilliseconds(0)

  paymentDeadline = deadline.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) + ' pukul ' + deadline.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}
```

#### 2. Added Warning UI Component
```tsx
{/* Payment Deadline Warning - Only for pending/belum bayar status */}
{isPending && paymentDeadline && (
  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
    <div className="flex items-start gap-2">
      <svg className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex-1">
        <p className="font-belleza text-xs md:text-sm text-yellow-800 font-semibold">
          Selesaikan pembayaran Anda
        </p>
        <p className="font-belleza text-xs text-yellow-700 mt-1">
          Batas waktu pembayaran Anda sampai <span className="font-semibold">{paymentDeadline}</span>
        </p>
        <p className="font-belleza text-xs text-yellow-600 mt-1">
          Pesanan akan dibatalkan otomatis jika tidak dibayar sebelum batas waktu.
        </p>
      </div>
    </div>
  </div>
)}
```

## 🎨 UI/UX Design

### Warning Box Styling
- **Background**: Yellow-50 (soft yellow background)
- **Border**: Yellow-300 (yellow border)
- **Icon**: Clock icon (🕐) in yellow-600
- **Text Colors**:
  - Heading: yellow-800 (dark yellow)
  - Body: yellow-700 (medium yellow)
  - Note: yellow-600 (yellow)

### Responsive Design
- Mobile & Desktop optimized
- Text size adjusts based on screen size:
  - Mobile: `text-xs`
  - Desktop: `text-sm`

## 📐 Logic & Calculation

### Deadline Calculation
1. **Base**: `created_at + 24 hours`
2. **Round UP**: To next full hour (e.g., 14:23 → 15:00)
3. **Reason**: Cron job runs every hour at `:00` minutes
4. **Format**: "DD MMMM YYYY pukul HH:mm"

### Example
```
Order created: 15 November 2025 14:23
Deadline raw: 16 November 2025 14:23
Deadline final: 16 November 2025 15:00 (rounded up)
Display: "16 November 2025 pukul 15:00"
```

### Condition to Show Warning
```typescript
isPending && paymentDeadline
```
Where:
- `isPending = status === 'pending' || status === 'belum bayar'`
- `paymentDeadline` is calculated from `created_at`

## 🔄 Integration with Auto-Cancel System

### Related Components
1. **Database Function**: `auto_cancel_pending_orders()`
   - File: `create_auto_cancel_pending_orders_function.sql`
   - Cancels orders older than 24 hours

2. **Cron Job**: `/api/cron/auto-cancel-pending-orders`
   - File: `src/app/api/cron/auto-cancel-pending-orders/route.ts`
   - Runs every hour at `:00`

3. **Vercel Cron**: `vercel.json`
   - Schedule: `0 * * * *` (every hour)

### Flow
```
1. User creates order → status: pending
2. Warning shows deadline (created_at + 24 hours)
3. Cron runs every hour
4. If order still pending after 24 hours → auto-cancel
5. Warning disappears (status no longer pending)
```

## 🧪 Testing

### Test Script
Created: `test_payment_deadline_warning.js`

Run:
```bash
node test_payment_deadline_warning.js
```

### Manual Testing

#### Option 1: Create New Pending Order
1. Go to checkout page
2. Create new order
3. Don't complete payment (leave as pending)
4. Visit order detail page
5. Warning should appear with deadline

#### Option 2: Update Existing Order
```sql
-- In Supabase SQL Editor
UPDATE orders
SET status = 'pending'
WHERE id = 'your-order-id';
```

Then visit: `https://meoris.id/user/purchase?view=order-detail&order=your-order-id`

### Expected Result
✅ Yellow warning box appears with:
- Clock icon
- "Selesaikan pembayaran Anda"
- Deadline date and time
- Auto-cancel warning message

## 📱 Screenshots

### Warning Appearance
```
┌─────────────────────────────────────────────────┐
│  🕐 Selesaikan pembayaran Anda                  │
│                                                 │
│  Batas waktu pembayaran Anda sampai            │
│  16 November 2025 pukul 15:00                  │
│                                                 │
│  Pesanan akan dibatalkan otomatis jika tidak   │
│  dibayar sebelum batas waktu.                  │
└─────────────────────────────────────────────────┘
```

## 🎯 Success Criteria

✅ Warning appears only for pending/belum bayar orders
✅ Deadline calculated correctly (created_at + 24 hours, rounded up)
✅ Format tanggal sesuai locale Indonesia
✅ Responsive di mobile dan desktop
✅ Styling konsisten dengan design system
✅ Warning hilang jika status berubah (paid, cancelled, etc)

## 📝 Notes

1. **Why Round Up?**
   - Cron job berjalan setiap jam di menit `:00`
   - Rounding memastikan deadline akurat dengan waktu eksekusi cron
   - User tidak akan kecewa dengan auto-cancel prematur

2. **Status Check**
   - Warning hanya muncul untuk status `pending` atau `belum bayar`
   - Status lain (paid, processing, shipped, dll) tidak menampilkan warning

3. **Time Calculation**
   - Menggunakan `created_at` sebagai starting point
   - 24 jam = 1440 menit = 86400000 milliseconds
   - Timezone sesuai dengan sistem (Indonesia)

## 🔗 Related Files

- `src/app/produk/pesanan/[orderId]/OrderDetailClient.tsx` - Main implementation
- `create_auto_cancel_pending_orders_function.sql` - Database function
- `src/app/api/cron/auto-cancel-pending-orders/route.ts` - Cron endpoint
- `vercel.json` - Cron schedule configuration
- `test_payment_deadline_warning.js` - Test script
- `AUTO_CANCEL_PENDING_ORDERS_SETUP.md` - Setup documentation

## 🚀 Deployment Checklist

Before deploying to production:

- [x] Code implemented and tested locally
- [x] Warning styling matches design system
- [x] Calculation logic verified
- [ ] Manual testing with real pending order
- [ ] Test on mobile devices
- [ ] Test on different browsers
- [ ] Verify auto-cancel cron is running
- [ ] Monitor logs for any errors

## ⚠️ Important

**Production Note**:
- Pastikan `CRON_SECRET` sudah di-set dengan value yang aman
- Vercel Cron hanya berfungsi di production deployment
- Test auto-cancel function di production setelah deploy
- Monitor notification table untuk memastikan user mendapat notifikasi

---

Implementation completed successfully! 🎉

User sekarang akan melihat warning batas waktu pembayaran pada halaman detail pesanan mereka.
