# Validation System Implementation - Timeline Step 4

## Overview
Implementasi sistem validasi untuk timeline "Sedang Divalidasi" yang menggantikan tracking pengiriman return dengan status validasi produk oleh admin.

## Database Schema

### New Columns in `returns` Table

```sql
-- Add to returns table
ALTER TABLE public.returns
ADD COLUMN IF NOT EXISTS status_validasi TEXT;

ALTER TABLE public.returns
ADD COLUMN IF NOT EXISTS validasi TEXT CHECK (validasi IN ('approved', 'rejected', NULL));
```

| Column | Type | Description | Values |
|--------|------|-------------|--------|
| `status_validasi` | TEXT | Current validation status description | "Sedang memeriksa kondisi produk", "Validasi selesai - produk sesuai" |
| `validasi` | TEXT | Validation result | `'approved'`, `'rejected'`, `NULL` |

### Migration Steps

**Option 1: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project → SQL Editor
3. Paste SQL from `add_validation_columns_to_returns.sql`
4. Run

**Option 2: Manual DDL**
See file: `MANUAL_ADD_VALIDATION_COLUMNS.md`

## UI Changes

### Timeline Step 4: "Sedang Divalidasi"

**File**: `src/app/user/purchase/page.tsx`

#### 1. Card Title Change
**Line 2965**
```tsx
// Before
<h4>Status Pengiriman Return</h4>

// After
<h4>Status Validasi</h4>
```

#### 2. Content Replacement
**Lines 2963-3014**

**Before**: Tracking history dengan shipping updates
**After**: Validation status dengan badge

```tsx
{/* Card Status Validasi */}
<div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
  <h4 className="text-sm font-semibold text-gray-900 mb-3">Status Validasi</h4>

  <div className="space-y-3">
    {submittedReturn?.status_validasi ? (
      <div className="flex gap-3">
        {/* Colored dot based on validation result */}
        <div className={`w-3 h-3 rounded-full ${
          submittedReturn?.validasi === 'approved' ? 'bg-green-600' :
          submittedReturn?.validasi === 'rejected' ? 'bg-red-600' :
          'bg-blue-600'
        }`}></div>

        <div className="flex-1">
          {/* Status text */}
          <p className={`text-xs font-medium ${
            submittedReturn?.validasi === 'approved' ? 'text-green-700' :
            submittedReturn?.validasi === 'rejected' ? 'text-red-700' :
            'text-gray-900'
          }`}>
            {submittedReturn.status_validasi}
          </p>

          {/* Timestamp */}
          <p className="text-[10px] text-gray-500 mt-0.5">
            {formatDate(submittedReturn.updated_at)}
          </p>

          {/* Badge: ✓ Disetujui / ✗ Ditolak */}
          {submittedReturn?.validasi && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              submittedReturn.validasi === 'approved'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {submittedReturn.validasi === 'approved' ? '✓ Disetujui' : '✗ Ditolak'}
            </span>
          )}
        </div>
      </div>
    ) : (
      <p className="text-xs text-gray-500">Belum ada status validasi</p>
    )}
  </div>
</div>
```

**Removed**:
- ❌ Tracking history timeline
- ❌ No. Resi section
- ❌ Kurir section

#### 3. Step 5 Button Logic
**Lines 2497-2509**

```tsx
{/* Step 5: Pergantian */}
<button
  onClick={() => updateTimelineUrl('replacement')}
  className={submittedReturn?.validasi === 'approved' ? 'cursor-pointer ...' : 'cursor-not-allowed opacity-60'}
  disabled={submittedReturn?.validasi !== 'approved'}
>
  <div className={submittedReturn?.validasi === 'approved' ? 'bg-red-600' : 'bg-gray-200'}>
    <svg stroke={submittedReturn?.validasi === 'approved' ? 'white' : '#9CA3AF'} />
  </div>
  <p className={submittedReturn?.validasi === 'approved' ? 'text-gray-900 font-medium' : 'text-gray-500'}>
    Pergantian & Pengiriman
  </p>
</button>
```

**Logic**: Step 5 ONLY active when `validasi === 'approved'`

#### 4. Progress Bar Update
**Line 2439**

```tsx
<div style={{
  width: submittedReturn?.validasi === 'approved' ? '100%' :
         submittedReturn?.status === 'validating' ? '75%' :
         submittedReturn?.return_waybill ? '50%' :
         submittedReturn?.status === 'approved' ? '25%' : '0%'
}}></div>
```

**Progress Stages**:
- 0% → pending
- 25% → approved
- 50% → return_waybill set
- 75% → validating
- **100% → validasi = approved** ✅ NEW

## Validation Flow

### Complete User Journey

```
1. User submits return
   └─> status: pending

2. Admin approves return
   └─> status: approved
   └─> User arranges pickup

3. User ships product back
   └─> return_waybill: "WYB-123"
   └─> Tracking updates received via webhook

4. Product delivered to Meoris (webhook auto-update)
   └─> status: validating
   └─> Timeline Step 4 ACTIVE

5. Admin validates product
   ├─> Option A: APPROVE
   │   └─> validasi: 'approved'
   │   └─> status_validasi: 'Validasi selesai - produk sesuai'
   │   └─> status: 'completed'
   │   └─> Timeline Step 5 ACTIVE ✅
   │
   └─> Option B: REJECT
       └─> validasi: 'rejected'
       └─> status_validasi: 'Validasi ditolak - produk tidak sesuai'
       └─> Timeline Step 5 DISABLED ❌
```

### Timeline Navigation Matrix

| Status | validasi | Step 1 | Step 2 | Step 3 | Step 4 | Step 5 |
|--------|----------|--------|--------|--------|--------|--------|
| `pending` | NULL | ✅ | ❌ | ❌ | ❌ | ❌ |
| `approved` | NULL | ✅ | ✅ | ❌ | ❌ | ❌ |
| `approved` + waybill | NULL | ✅ | ✅ | ✅ | ❌ | ❌ |
| `validating` | NULL | ✅ | ✅ | ✅ | ✅ | ❌ |
| `validating` | `approved` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `validating` | `rejected` | ✅ | ✅ | ✅ | ✅ | ❌ |

## Admin Workflow

### Approve Validation

```sql
UPDATE returns
SET validasi = 'approved',
    status_validasi = 'Validasi selesai - produk sesuai dengan kondisi',
    status = 'completed'
WHERE id = '<return_id>';
```

**Result**:
- ✅ Timeline Step 5 becomes active (red icon)
- ✅ Badge shows "✓ Disetujui" (green)
- ✅ Progress bar → 100%
- ✅ User can proceed to replacement step

### Reject Validation

```sql
UPDATE returns
SET validasi = 'rejected',
    status_validasi = 'Validasi ditolak - produk tidak sesuai dengan kondisi pengembalian'
WHERE id = '<return_id>';
```

**Result**:
- ❌ Timeline Step 5 remains disabled
- ❌ Badge shows "✗ Ditolak" (red)
- ✅ Progress bar stays at 75%
- ❌ User cannot proceed to replacement

### Update Validation Status (During Review)

```sql
UPDATE returns
SET status_validasi = 'Sedang memeriksa kondisi produk - estimasi 1 hari'
WHERE id = '<return_id>';
```

**Result**:
- 🔵 Blue dot indicator
- ℹ️ Status message displayed
- ⏳ No badge (validation pending)

## UI Visual Examples

### Example 1: Validation Pending
```
┌──────────────────────────────────────┐
│ Status Validasi                      │
│                                      │
│ 🔵 Sedang memeriksa kondisi produk   │
│    8 November 2025, 14:30            │
└──────────────────────────────────────┘
```

### Example 2: Validation Approved
```
┌──────────────────────────────────────┐
│ Status Validasi                      │
│                                      │
│ 🟢 Validasi selesai - produk sesuai  │
│    8 November 2025, 16:45            │
│    [✓ Disetujui]                     │
└──────────────────────────────────────┘
```

### Example 3: Validation Rejected
```
┌──────────────────────────────────────┐
│ Status Validasi                      │
│                                      │
│ 🔴 Validasi ditolak - produk tidak   │
│    sesuai kondisi                    │
│    8 November 2025, 16:45            │
│    [✗ Ditolak]                       │
└──────────────────────────────────────┘
```

### Example 4: No Validation Yet
```
┌──────────────────────────────────────┐
│ Status Validasi                      │
│                                      │
│ Belum ada status validasi            │
└──────────────────────────────────────┘
```

## Testing

### Run Test Script

```bash
node test_validation_flow.js
```

**Test scenarios**:
1. Find return with status = `validating`
2. Set validation status message
3. Approve validation
4. Verify UI state

### Manual Testing

1. **Setup**:
   - Ensure you have a return with status = `validating`
   - Add validation columns to database

2. **Test Pending State**:
   ```sql
   UPDATE returns
   SET status_validasi = 'Sedang memeriksa kondisi produk'
   WHERE id = '...';
   ```
   - Open UI → Step 4
   - Expected: Blue dot, status message, no badge

3. **Test Approval**:
   ```sql
   UPDATE returns
   SET validasi = 'approved',
       status_validasi = 'Validasi selesai - produk sesuai',
       status = 'completed'
   WHERE id = '...';
   ```
   - Refresh UI
   - Expected: Green dot, green badge "✓ Disetujui", Step 5 active

4. **Test Rejection**:
   ```sql
   UPDATE returns
   SET validasi = 'rejected',
       status_validasi = 'Validasi ditolak - produk rusak'
   WHERE id = '...';
   ```
   - Refresh UI
   - Expected: Red dot, red badge "✗ Ditolak", Step 5 disabled

## Files Modified

### Backend (Database)
- ✅ `add_validation_columns_to_returns.sql` - Migration script
- ✅ `MANUAL_ADD_VALIDATION_COLUMNS.md` - Manual migration guide

### Frontend
- ✅ `src/app/user/purchase/page.tsx`
  - Line 2439: Progress bar logic
  - Lines 2497-2509: Step 5 button activation
  - Lines 2963-3014: Validation status card

### Testing & Documentation
- ✅ `test_validation_flow.js` - Test script
- ✅ `VALIDATION_SYSTEM_IMPLEMENTATION.md` - This file

## Migration Checklist

- [ ] Run database migration (add columns)
- [ ] Verify columns exist in Supabase
- [ ] Test with sample return data
- [ ] Update admin interface to set validasi status
- [ ] Test approval flow
- [ ] Test rejection flow
- [ ] Document admin procedures

## Admin Interface (Future Work)

**Recommended**: Create admin panel with:
- List of returns with status = `validating`
- Form to set `status_validasi` message
- Buttons to approve/reject validation
- Product images/details for review

**Example Admin API endpoint**:
```typescript
// POST /api/admin/returns/validate
{
  "return_id": "uuid",
  "validasi": "approved", // or "rejected"
  "status_validasi": "Validasi selesai - produk sesuai"
}
```

## Support

For issues:
1. Verify database columns exist
2. Check browser console for errors
3. Ensure return has `status = 'validating'`
4. Test with sample data using test script

## Rollback

If needed to rollback:

```sql
-- Remove columns
ALTER TABLE public.returns DROP COLUMN IF EXISTS status_validasi;
ALTER TABLE public.returns DROP COLUMN IF EXISTS validasi;
```

Revert UI changes by restoring previous tracking history display.
