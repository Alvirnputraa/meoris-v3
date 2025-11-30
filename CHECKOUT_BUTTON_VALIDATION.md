# Checkout Button Validation

## Problem
Button "Lanjutkan Pembayaran" bisa diklik meskipun:
- User belum punya alamat
- Belum pilih metode pengiriman
- Belum pilih metode pembayaran

## Solution Applied

### 1. Validation Logic
**File:** `src/app/produk/checkout/page.tsx:740-745`

Added validation checks:
```typescript
// Validasi form untuk enable/disable button
const hasAddress = !!profileAddress
const hasShipping = !!selectedShipping && isCourierAvailable(selectedShipping)
const hasPaymentMethod = !!paymentMethod
const isFormValid = hasAddress && hasShipping && hasPaymentMethod
const isButtonDisabled = submitLoading || !isFormValid
```

### 2. Button Disabled State
**File:** `src/app/produk/checkout/page.tsx:1954`

**Before:**
```tsx
<button type="submit" disabled={submitLoading} ...>
```

**After:**
```tsx
<button type="submit" disabled={isButtonDisabled} ...>
```

### 3. Validation Messages
**File:** `src/app/produk/checkout/page.tsx:1968-1975`

Added helpful messages below button:
```tsx
{!isFormValid && !submitLoading && (
  <div className="mt-2 text-xs text-gray-600 text-center">
    {!hasAddress && <p>• Harap lengkapi alamat pengiriman</p>}
    {!hasShipping && <p>• Harap pilih metode pengiriman yang tersedia</p>}
    {!hasPaymentMethod && <p>• Harap pilih metode pembayaran</p>}
  </div>
)}
```

## Validation Rules

### 1. Has Address (`hasAddress`)
```typescript
const hasAddress = !!profileAddress
```
- ✅ Valid: User sudah set alamat pengiriman
- ❌ Invalid: `profileAddress` is null/undefined

### 2. Has Shipping (`hasShipping`)
```typescript
const hasShipping = !!selectedShipping && isCourierAvailable(selectedShipping)
```
- ✅ Valid: User sudah pilih courier DAN courier tersedia (punya harga)
- ❌ Invalid: Belum pilih courier ATAU courier yang dipilih "Tidak tersedia"

### 3. Has Payment Method (`hasPaymentMethod`)
```typescript
const hasPaymentMethod = !!paymentMethod
```
- ✅ Valid: User sudah pilih metode pembayaran (QRIS, BCA, dll)
- ❌ Invalid: Belum pilih metode pembayaran

### 4. Form Valid (`isFormValid`)
```typescript
const isFormValid = hasAddress && hasShipping && hasPaymentMethod
```
ALL conditions must be true.

### 5. Button Disabled (`isButtonDisabled`)
```typescript
const isButtonDisabled = submitLoading || !isFormValid
```
Button disabled if:
- Currently submitting (loading) OR
- Form is not valid

## UI States

### State 1: All Valid
```
┌─────────────────────────────────┐
│ Lanjutkan Pembayaran            │ ← Enabled, clickable
└─────────────────────────────────┘
```

### State 2: Missing Address
```
┌─────────────────────────────────┐
│ Lanjutkan Pembayaran (disabled) │ ← 60% opacity
└─────────────────────────────────┘
• Harap lengkapi alamat pengiriman
```

### State 3: Missing Shipping
```
┌─────────────────────────────────┐
│ Lanjutkan Pembayaran (disabled) │
└─────────────────────────────────┘
• Harap pilih metode pengiriman yang tersedia
```

### State 4: Multiple Missing
```
┌─────────────────────────────────┐
│ Lanjutkan Pembayaran (disabled) │
└─────────────────────────────────┘
• Harap lengkapi alamat pengiriman
• Harap pilih metode pengiriman yang tersedia
• Harap pilih metode pembayaran
```

### State 5: Submitting
```
┌─────────────────────────────────┐
│ ⟳ Memproses Pembayaran...       │ ← Disabled, with spinner
└─────────────────────────────────┘
```

## Edge Cases Handled

### Case 1: User Selects Unavailable Courier
```typescript
// JNE selected but shows "Tidak tersedia"
selectedShipping = 'JNE'
isCourierAvailable('JNE') = false

// Result:
hasShipping = false  // ❌ Button disabled
```

Message: "• Harap pilih metode pengiriman yang tersedia"

### Case 2: Shipping Becomes Unavailable After Selection
```typescript
// User selected J&T, then postal code changed, J&T no longer available
selectedShipping = 'J&T Express'
ongkirOptions = { 'sicepat': {...} }  // No J&T

// Result:
isCourierAvailable('J&T Express') = false
hasShipping = false  // ❌ Button disabled
```

### Case 3: User Has Address Then Removes It
```typescript
profileAddress = null  // Address deleted/cleared

// Result:
hasAddress = false  // ❌ Button disabled
```

## Benefits

✅ **Prevent Invalid Submissions** - Can't submit incomplete checkout
✅ **Clear Feedback** - User knows exactly what's missing
✅ **Better UX** - No cryptic errors after clicking button
✅ **Validates Courier Availability** - Ensures selected courier actually has rate

## Testing

### Test 1: Fresh Checkout (No Data)
1. Open checkout page with new account
2. Expected:
   - Button is **disabled**
   - Shows all 3 validation messages
3. Add address → "alamat" message disappears
4. Select courier → "pengiriman" message disappears
5. Select payment → All messages disappear, button **enabled**

### Test 2: Unavailable Courier Selection
1. Open checkout with limited courier coverage
2. Select courier that shows "Tidak tersedia"
3. Expected:
   - Button remains **disabled**
   - Message: "Harap pilih metode pengiriman yang tersedia"

### Test 3: Complete Form
1. Ensure address exists
2. Select available courier (has price)
3. Select payment method
4. Expected:
   - Button is **enabled**
   - No validation messages
   - Can click to submit

### Test 4: During Submission
1. Complete form and click button
2. Expected:
   - Button shows "Memproses Pembayaran..." with spinner
   - Button is **disabled**
   - No validation messages

## Files Modified

1. **`src/app/produk/checkout/page.tsx`**
   - Line 740-745: Validation logic
   - Line 1954: Button disabled prop updated
   - Line 1968-1975: Validation messages UI

## Related Features

- `isCourierAvailable()` - Helper function to check courier availability
- `profileAddress` - User address state
- `selectedShipping` - Selected courier state
- `paymentMethod` - Selected payment method state
- `submitLoading` - Submission loading state

---

**Date:** 2025-01-15
**Status:** ✅ Complete
**Impact:** Prevents invalid checkout submissions
