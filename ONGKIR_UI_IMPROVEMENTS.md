# Ongkir UI Improvements

## Changes Applied

### 1. Dynamic Duration from API
**Sebelumnya:** Estimasi hardcoded
```tsx
<p>Estimasi 2-3 hari kerja</p>
```

**Sekarang:** Dari Biteship API response
```tsx
<p>{renderEstimasi('J&T Express')}</p>
// Output: "Estimasi 3-5 hari" (dari API field: duration atau shipment_duration_range)
```

### 2. Removed Courier Icons
**Sebelumnya:** Tampil icon/logo ekspedisi
```tsx
<Image src="/images/j&t.png" alt="J&T Express" width={40} height={20} />
```

**Sekarang:** Hanya text label (icon dihapus)

### 3. "Perbaikan" Label for Unavailable Couriers
**Sebelumnya:** Menampilkan "-"
```tsx
return <span>-</span>
```

**Sekarang:** Menampilkan "Perbaikan" dengan warna orange
```tsx
return <span className="font-belleza text-xs text-orange-600 font-medium">Perbaikan</span>
```

### 4. Disabled State for Unavailable Couriers
**Sebelumnya:** Tetap bisa diklik meskipun tidak ada ongkir

**Sekarang:** Disabled + opacity 50%
```tsx
disabled={!isCourierAvailable('JNE')}
className={`... ${!isCourierAvailable('JNE') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
```

## Implementation Details

### Data Structure Change
**Sebelumnya:**
```typescript
ongkirOptions: Record<string, number>
// { 'j&t': 21000, 'sicepat': 13500 }
```

**Sekarang:**
```typescript
ongkirOptions: Record<string, { price: number; duration: string }>
// {
//   'j&t': { price: 21000, duration: '2 - 3 days' },
//   'sicepat': { price: 13500, duration: '3 - 5 days' }
// }
```

### Helper Functions

#### `renderOngkirPrice(label: string)`
```typescript
// Returns price or "Perbaikan" label
if (rateData?.price) {
  return <span>Rp {price}</span>
}
return <span className="text-orange-600">Perbaikan</span>
```

#### `renderEstimasi(label: string)`
```typescript
// Returns duration from API or fallback
if (rateData?.duration) {
  const duration = rateData.duration
    .replace(' days', ' hari')
    .replace(' - ', '-')
  return `Estimasi ${duration}`
}
return 'Estimasi tidak tersedia'
```

#### `isCourierAvailable(label: string)`
```typescript
// Check if courier has valid price
return !!rateData?.price
```

## UI States

### State 1: Courier Available (Normal)
```
┌─────────────────────────────────────┐
│ ○ J&T Express      Rp 21.000        │
│   Estimasi 2-3 hari                 │
└─────────────────────────────────────┘
✅ Clickable, normal cursor, full opacity
```

### State 2: Courier Unavailable (Disabled)
```
┌─────────────────────────────────────┐
│ ○ JNE              Perbaikan        │
│   Estimasi tidak tersedia           │
└─────────────────────────────────────┘
❌ Not clickable, disabled, 50% opacity
```

### State 3: Loading
```
┌─────────────────────────────────────┐
│ ○ SiCepat          Loading...       │
│   Loading...                        │
└─────────────────────────────────────┘
```

## Console Output Example

```javascript
[Biteship Rates] Raw pricing data: [
  {
    company: 'jnt',
    price: 21000,
    duration: '2 - 3 days',
    shipment_duration_range: '2 - 3'
  },
  {
    company: 'sicepat',
    price: 21500,
    duration: '3 - 5 days',
    shipment_duration_range: '3 - 5'
  }
]

[Biteship Rate] { company: 'jnt', price: 21000, duration: '2 - 3 days' }
[Biteship Rate] { company: 'sicepat', price: 21500, duration: '3 - 5 days' }

[Biteship Rates] Loaded rates: {
  'j&t': { price: 21000, duration: '2 - 3 days' },
  'sicepat': { price: 21500, duration: '3 - 5 days' }
}

[renderOngkirPrice] { label: 'J&T Express', rateData: { price: 21000, duration: '2 - 3 days' } }
[renderOngkirPrice] { label: 'JNE', rateData: undefined } // "Perbaikan"
[renderOngkirPrice] { label: 'SiCepat', rateData: { price: 21500, duration: '3 - 5 days' } }
```

## Expected UI

### Case 1: All Couriers Available
```
Pengiriman
┌─────────────────────────────────────┐
│ ● J&T Express      Rp 14.000        │
│   Estimasi 2-3 hari                 │
├─────────────────────────────────────┤
│ ○ JNE              Rp 15.000        │
│   Estimasi 3-5 hari                 │
├─────────────────────────────────────┤
│ ○ SiCepat          Rp 13.500        │
│   Estimasi 2-4 hari                 │
└─────────────────────────────────────┘
```

### Case 2: Partial Availability (Your Current Case)
```
Pengiriman
┌─────────────────────────────────────┐
│ ● J&T Express      Rp 21.000        │
│   Estimasi 2-3 hari                 │
├─────────────────────────────────────┤
│ ○ JNE              Perbaikan  (50%) │ ← Disabled
│   Estimasi tidak tersedia           │
├─────────────────────────────────────┤
│ ○ SiCepat          Rp 21.500        │
│   Estimasi 3-5 hari                 │
└─────────────────────────────────────┘
```

## Testing

### 1. Test Dynamic Duration
1. Open checkout page
2. Check console for `[Biteship Rate]` logs
3. Verify `duration` field exists
4. Check UI shows "Estimasi X-Y hari" from API

### 2. Test Disabled State
1. Find postal code with limited courier support
2. Check UI:
   - Unavailable courier has "Perbaikan" label
   - Radio button is disabled
   - Label has 50% opacity
   - Cursor is "not-allowed"
3. Try clicking disabled courier → Should not work

### 3. Test No Icons
1. Verify no courier logos/images displayed
2. Only text labels should appear

## Files Modified

1. **`src/app/produk/checkout/page.tsx`**
   - Line 30: Updated type definition
   - Line 529-565: Store duration from API
   - Line 585-586: Update ongkirAmount from rateData.price
   - Line 589-605: Updated renderOngkirPrice (return "Perbaikan")
   - Line 607-625: New renderEstimasi function
   - Line 627-631: New isCourierAvailable function
   - Line 1721-1782: Updated all 3 courier UI components

2. **`src/app/api/biteship/rates/route.ts`**
   - Line 84: Added `sicepat` to courier request (previous fix)

## Benefits

✅ **Accurate Estimates** - Duration dari API, bukan hardcoded
✅ **Clear Unavailability** - "Perbaikan" lebih jelas dari "-"
✅ **Better UX** - Disabled state prevents user confusion
✅ **Cleaner UI** - No courier icons, lebih minimalis
✅ **Consistent** - Semua courier menggunakan sistem yang sama

---

**Date:** 2025-01-15
**Status:** ✅ Complete
**Impact:** Better UX for courier selection
