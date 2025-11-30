# Address Loading State Fix

## Problem
Saat refresh halaman checkout, sebelum data alamat loaded, langsung muncul:
```
"Alamat profil belum lengkap"
```

Ini terlihat tidak profesional karena data sebenarnya sedang loading.

## Solution Applied

### 1. Added Loading State
**File:** `src/app/produk/checkout/page.tsx:31`

```typescript
const [addressLoading, setAddressLoading] = useState(true)
```

Initial value: `true` (assume loading saat pertama render)

### 2. Set Loading State in useEffect
**File:** `src/app/produk/checkout/page.tsx:327,414-416`

```typescript
useEffect(() => {
  if (!user) return
  setAddressLoading(true)  // Start loading
  ;(async () => {
    try {
      // Fetch address...
    } catch (e) {
      console.warn('Gagal memuat alamat profil:', e)
    } finally {
      setAddressLoading(false)  // Stop loading
    }
  })()
}, [user])
```

### 3. Updated UI with Loading State
**File:** `src/app/produk/checkout/page.tsx:1594-1645`

**Before:**
```tsx
{profileAddress ? (
  <div>Alamat data...</div>
) : (
  <div>Alamat profil belum lengkap</div>
)}
```

**After:**
```tsx
{addressLoading ? (
  <div className="text-center py-6">
    <svg className="animate-spin h-8 w-8 text-gray-400 mx-auto mb-2">...</svg>
    <p className="font-belleza text-xs text-gray-500">Memuat alamat...</p>
  </div>
) : profileAddress ? (
  <div>Alamat data...</div>
) : (
  <div>Alamat profil belum lengkap</div>
)}
```

## UI States

### State 1: Loading (Initial/Refresh)
```
┌─────────────────────────────────┐
│ Alamat Tersimpan                │
│ Diambil dari profil Anda        │
├─────────────────────────────────┤
│                                 │
│       ⟳ (spinning)              │
│    Memuat alamat...             │
│                                 │
└─────────────────────────────────┘
```

Duration: ~200-500ms (typical)

### State 2: Has Address (After Load)
```
┌─────────────────────────────────┐
│ Alamat Tersimpan                │
│ Diambil dari profil Anda        │
├─────────────────────────────────┤
│ NAMA                            │
│ John Doe                        │
│                                 │
│ NOMOR TELEPON                   │
│ 08123456789                     │
│                                 │
│ ALAMAT                          │
│ Jl. Example No. 123, ...        │
│                                 │
│ → Ubah alamat                   │
└─────────────────────────────────┘
```

### State 3: No Address (After Load)
```
┌─────────────────────────────────┐
│ Alamat Tersimpan                │
│ Diambil dari profil Anda        │
├─────────────────────────────────┤
│                                 │
│       📍 (location icon)        │
│  Alamat profil belum lengkap    │
│                                 │
│    → Lengkapi alamat            │
│                                 │
└─────────────────────────────────┘
```

## Flow

### Page Load Sequence
```
1. Component Mount
   → addressLoading = true (initial state)
   → UI shows: "Memuat alamat..."

2. useEffect Triggers
   → setAddressLoading(true)
   → Fetch /api/user/addresses

3. Fetch Complete
   → setProfileAddress(data) OR null
   → setAddressLoading(false)

4. UI Updates
   → If has data: Show address details
   → If no data: Show "Alamat profil belum lengkap"
```

### Refresh Behavior (Before Fix)
```
1. Page refresh
2. addressLoading = false (default)
3. profileAddress = null (not loaded yet)
4. UI shows: "Alamat profil belum lengkap" ❌ (immediate, wrong)
5. 200ms later: Address loads
6. UI updates: Shows address data
```

### Refresh Behavior (After Fix)
```
1. Page refresh
2. addressLoading = true (default)
3. UI shows: "Memuat alamat..." ✅ (loading state)
4. 200ms later: Address loads
5. addressLoading = false
6. UI updates: Shows address data
```

## Benefits

✅ **Professional UX** - No flash of "belum lengkap" message
✅ **Clear Feedback** - User knows data is loading
✅ **Smooth Transition** - Loading → Data (no jarring changes)
✅ **Accurate State** - Only shows "belum lengkap" when truly no address

## Testing

### Test 1: Fresh Page Load
1. Open checkout page
2. Expected:
   - Brief "Memuat alamat..." (spinner)
   - Then either address data OR "belum lengkap"

### Test 2: Page Refresh
1. On checkout page, press F5/refresh
2. Expected:
   - "Memuat alamat..." appears immediately
   - No flash of "belum lengkap"
   - Smooth transition to address data

### Test 3: Slow Network
1. Throttle network to Slow 3G (DevTools)
2. Refresh page
3. Expected:
   - "Memuat alamat..." shows for longer
   - Still no premature "belum lengkap"

### Test 4: No Address
1. Use account without address
2. Expected:
   - "Memuat alamat..." first
   - Then "Alamat profil belum lengkap"
   - NOT immediate "belum lengkap"

## Files Modified

1. **`src/app/produk/checkout/page.tsx`**
   - Line 31: Added `addressLoading` state
   - Line 327: Set loading = true on useEffect start
   - Line 414-416: Set loading = false in finally block
   - Line 1594-1645: Updated UI with loading state

---

**Date:** 2025-01-15
**Status:** ✅ Fixed
**Impact:** Better UX on page load/refresh
