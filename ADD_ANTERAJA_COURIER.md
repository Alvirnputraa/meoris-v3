# Add Anteraja Courier Support

## Changes Applied

### 1. Biteship API Request
**File:** `src/app/api/biteship/rates/route.ts:84`

**Before:**
```typescript
couriers: 'jnt,jne,sicepat'
```

**After:**
```typescript
couriers: 'jnt,jne,sicepat,anteraja'
```

### 2. Mapping Logic
**File:** `src/app/produk/checkout/page.tsx:562-567`

Added Anteraja mapping:
```typescript
// Map Anteraja
if (company.includes('anteraja') || company.includes('ante raja')) {
  if (!mapped['anteraja'] || price < mapped['anteraja'].price) {
    mapped['anteraja'] = { price, duration }
  }
}
```

### 3. UI Component
**File:** `src/app/produk/checkout/page.tsx:1790-1809`

Added Anteraja radio button:
```tsx
<label className={`flex items-center gap-3 p-3 bg-white rounded-lg transition-all border-2 ${!isCourierAvailable('Anteraja') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-black hover:shadow-sm'} ${selectedShipping === 'Anteraja' ? 'border-black bg-gray-50' : 'border-gray-200'}`}>
  <input
    type="radio"
    name="shipping_method"
    value="Anteraja"
    disabled={!isCourierAvailable('Anteraja')}
  />
  <div className="flex items-center justify-between flex-1">
    <div>
      <span className="font-belleza text-gray-900 text-sm">Anteraja</span>
      <p className="text-[10px] text-gray-600 mt-0.5">{renderEstimasi('Anteraja')}</p>
    </div>
    <div className="text-right">
      {renderOngkirPrice('Anteraja', selectedShipping === 'Anteraja')}
    </div>
  </div>
</label>
```

## Expected UI

```
Pengiriman
┌─────────────────────────────────────┐
│ ● J&T Express      Rp 21.000        │
│   Estimasi 2-3 hari                 │
├─────────────────────────────────────┤
│ ○ JNE              Perbaikan        │ ← Disabled
│   Estimasi tidak tersedia           │
├─────────────────────────────────────┤
│ ○ SiCepat          Rp 21.500        │
│   Estimasi 3-5 hari                 │
├─────────────────────────────────────┤
│ ○ Anteraja         Rp 18.000        │ ← NEW!
│   Estimasi 2-4 hari                 │
└─────────────────────────────────────┘
```

## Console Output Example

```javascript
[Biteship Rates] Raw pricing data: [
  { company: 'jnt', price: 21000, duration: '2 - 3 days' },
  { company: 'sicepat', price: 21500, duration: '3 - 5 days' },
  { company: 'anteraja', price: 18000, duration: '2 - 4 days' }
]

[Biteship Rate] { company: 'jnt', price: 21000, duration: '2 - 3 days' }
[Biteship Rate] { company: 'sicepat', price: 21500, duration: '3 - 5 days' }
[Biteship Rate] { company: 'anteraja', price: 18000, duration: '2 - 4 days' }

[Biteship Rates] Loaded rates: {
  'j&t': { price: 21000, duration: '2 - 3 days' },
  'sicepat': { price: 21500, duration: '3 - 5 days' },
  'anteraja': { price: 18000, duration: '2 - 4 days' }
}
```

## Testing

### 1. Test Anteraja Available
1. Refresh checkout page
2. Check console for Anteraja in rates
3. Verify UI shows Anteraja with price and duration
4. Try selecting Anteraja → Should work

### 2. Test Anteraja Unavailable
1. Use postal code without Anteraja coverage
2. Check UI:
   - Anteraja shows "Perbaikan"
   - Radio button disabled
   - 50% opacity
3. Try clicking → Should not work

## Features

✅ **Dynamic from API** - Price & duration dari Biteship
✅ **Auto-disable** - Jika tidak tersedia di area
✅ **No icon** - Minimalist design
✅ **"Perbaikan" label** - Clear unavailability indicator

## How to Add More Couriers

### Step 1: Update API Request
`src/app/api/biteship/rates/route.ts:84`
```typescript
couriers: 'jnt,jne,sicepat,anteraja,ninja,lion'
```

### Step 2: Add Mapping Logic
`src/app/produk/checkout/page.tsx` (after line 567)
```typescript
// Map Ninja Express
if (company.includes('ninja')) {
  if (!mapped['ninja'] || price < mapped['ninja'].price) {
    mapped['ninja'] = { price, duration }
  }
}
```

### Step 3: Add UI Component
`src/app/produk/checkout/page.tsx` (after line 1809)
```tsx
<label className={`... ${!isCourierAvailable('Ninja Express') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ...`}>
  <input
    type="radio"
    value="Ninja Express"
    disabled={!isCourierAvailable('Ninja Express')}
  />
  <div>
    <span>Ninja Express</span>
    <p>{renderEstimasi('Ninja Express')}</p>
  </div>
  <div>{renderOngkirPrice('Ninja Express', ...)}</div>
</label>
```

## Files Modified

1. **`src/app/api/biteship/rates/route.ts`**
   - Line 84: Added `anteraja` to courier list

2. **`src/app/produk/checkout/page.tsx`**
   - Line 562-567: Anteraja mapping logic
   - Line 1790-1809: Anteraja UI component

---

**Date:** 2025-01-15
**Status:** ✅ Complete
**Couriers Supported:** J&T Express, JNE, SiCepat, Anteraja (4 total)
