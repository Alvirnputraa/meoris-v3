# Fix Timeline Navigation - Atur Pengiriman & Pengiriman Barang

## Masalah
Setelah status return berubah menjadi `validating`, timeline steps 2 dan 3 tidak bisa diklik lagi:
- ❌ Step 2: "Atur Pengiriman" - disabled
- ❌ Step 3: "Pengiriman Barang" - disabled

Ini terjadi karena kondisi aktif hanya memeriksa `status === 'approved'` atau `return_waybill`, padahal setelah barang delivered, status sudah berubah menjadi `validating`.

## Solusi

### Step 2: Atur Pengiriman
**File**: `src/app/user/purchase/page.tsx:2455-2467`

**Sebelum**:
```tsx
disabled={submittedReturn?.status !== 'approved'}
className={submittedReturn?.status === 'approved' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
```

**Sesudah**:
```tsx
disabled={submittedReturn?.status !== 'approved' && submittedReturn?.status !== 'validating'}
className={submittedReturn?.status === 'approved' || submittedReturn?.status === 'validating' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
```

**Logic**: Step 2 bisa diklik ketika status = `approved` **ATAU** `validating`

### Step 3: Pengiriman Barang
**File**: `src/app/user/purchase/page.tsx:2469-2481`

**Sebelum**:
```tsx
disabled={!submittedReturn?.return_waybill}
className={submittedReturn?.return_waybill ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
```

**Sesudah**:
```tsx
disabled={!submittedReturn?.return_waybill && submittedReturn?.status !== 'validating'}
className={submittedReturn?.return_waybill || submittedReturn?.status === 'validating' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
```

**Logic**: Step 3 bisa diklik ketika `return_waybill` ada **ATAU** status = `validating`

## Status Timeline Navigation Matrix

| Status | Step 1: Review | Step 2: Atur Pengiriman | Step 3: Pengiriman | Step 4: Validasi | Step 5: Pergantian |
|--------|---------------|------------------------|-------------------|------------------|-------------------|
| `pending` | ✅ Active | ❌ Disabled | ❌ Disabled | ❌ Disabled | ❌ Disabled |
| `approved` | ✅ Active | ✅ **Active** | ❌ Disabled | ❌ Disabled | ❌ Disabled |
| `approved` + waybill | ✅ Active | ✅ Active | ✅ **Active** | ❌ Disabled | ❌ Disabled |
| `validating` | ✅ Active | ✅ **Active** ⚡ | ✅ **Active** ⚡ | ✅ **Active** | ❌ Disabled |
| `completed` | ✅ Active | ✅ Active | ✅ Active | ✅ Active | ✅ **Active** |

⚡ = Fixed dengan update ini

## User Flow Example

```
1. User submits return
   └─> status: pending
   └─> Timeline: ✅ Step 1 only

2. Admin approves return
   └─> status: approved
   └─> Timeline: ✅ Step 1, ✅ Step 2

3. User arranges shipping
   └─> return_waybill: "WYB-123"
   └─> Timeline: ✅ Step 1, ✅ Step 2, ✅ Step 3

4. Package delivered (webhook auto-update)
   └─> status: validating
   └─> Timeline: ✅ Step 1, ✅ Step 2, ✅ Step 3, ✅ Step 4
   └─> User can navigate back to check shipping info!
```

## Why This Fix is Important

### Before Fix
User tidak bisa kembali melihat:
- ❌ Info pengaturan pengiriman
- ❌ Tracking history pengiriman
- ❌ Nomor resi

### After Fix
User bisa bebas navigasi untuk melihat:
- ✅ Info pengaturan pengiriman (Step 2)
- ✅ Tracking history pengiriman (Step 3)
- ✅ Status validasi terkini (Step 4)
- ✅ Semua informasi tetap accessible

## Testing

### Manual Test
1. Buka return detail dengan status `validating`
2. Klik Step 2 "Atur Pengiriman" → ✅ Should work
3. Klik Step 3 "Pengiriman Barang" → ✅ Should work
4. Klik Step 4 "Sedang Divalidasi" → ✅ Should work
5. Semua steps 1-4 harus bisa diklik dan menampilkan konten masing-masing

### Visual Test
Check bahwa semua active steps memiliki:
- ✅ Red circular icon (instead of gray)
- ✅ White icon stroke (instead of gray)
- ✅ Bold black text (instead of gray)
- ✅ Hover effect (scale on hover)
- ✅ Clickable cursor

## Files Modified

- ✅ `src/app/user/purchase/page.tsx`
  - Lines 2455-2467: Step 2 "Atur Pengiriman" activation logic
  - Lines 2469-2481: Step 3 "Pengiriman Barang" activation logic

## Related Features

This fix complements:
- ✅ `AUTO_STATUS_UPDATE_VALIDATING.md` - Auto-update status to validating
- ✅ `FIX_RETURN_WEBHOOK_ERROR.md` - Webhook tracking system

## Future Considerations

If adding more statuses, remember to update:
1. Timeline button activation conditions
2. Progress bar width calculation
3. Step icon colors and styles
4. Navigation disabled/enabled logic

Example pattern:
```tsx
// Good pattern for future-proofing
const isStepActive = ['approved', 'validating', 'completed'].includes(submittedReturn?.status)

<button
  disabled={!isStepActive}
  className={isStepActive ? 'cursor-pointer' : 'cursor-not-allowed'}
>
```

## Rollback

If needed to rollback:

```tsx
// Step 2
disabled={submittedReturn?.status !== 'approved'}

// Step 3
disabled={!submittedReturn?.return_waybill}
```

But this will break navigation after status becomes `validating`.
