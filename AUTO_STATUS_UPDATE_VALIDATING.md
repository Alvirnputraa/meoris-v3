# Auto-Update Status Return: Delivered → Validating

## Overview
Implementasi fitur auto-update status pengembalian dari `approved` ke `validating` ketika barang return sudah diterima (status pengiriman = `delivered`).

## Flow Diagram

```
User Return Flow:
┌─────────────────┐
│ Status: pending │ → User submit return request
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Status: approved│ → Admin approve, user arrange shipping
└────────┬────────┘
         │
         ▼ User ships product back
┌─────────────────────────────┐
│ Tracking Updates (Webhook)  │
│ - picking_up                │
│ - picked                    │
│ - dropping_off              │
└────────┬────────────────────┘
         │
         ▼ Package delivered to Meoris
┌─────────────────────────────┐
│ Status: delivered (Webhook) │ ✅ AUTO-TRIGGER
└────────┬────────────────────┘
         │
         ▼ Webhook auto-updates
┌─────────────────────────────┐
│ Status: validating          │ 🎯 NEW STATUS
│ Notes: "Barang sudah kami   │
│         terima. Sedang      │
│         dalam proses        │
│         validasi."          │
└────────┬────────────────────┘
         │
         ▼ Timeline UI Updates
┌─────────────────────────────┐
│ Timeline Step 4 Active:     │
│ "Sedang Divalidasi"         │
│                             │
│ Shows:                      │
│ • ✅ Icon "Barang sudah     │
│   kami terima"              │
│ • Card "Status Pengiriman   │
│   Return" with full history │
│ • Product list              │
└─────────────────────────────┘
```

## Changes Made

### 1. Webhook Auto-Update Logic
**File**: `src/app/api/biteship/webhook/route.ts:164-183`

```typescript
// AUTO-UPDATE: Jika status = delivered, update return status ke 'validating'
if (status === 'delivered') {
  console.log(`🔄 Auto-updating return ${dbReturnId} status to 'validating'`)

  const { error: returnUpdateError } = await supabaseAdmin
    .from('returns')
    .update({
      status: 'validating',
      notes: 'Barang sudah kami terima. Sedang dalam proses validasi.'
    })
    .eq('id', dbReturnId)

  if (returnUpdateError) {
    console.error('❌ Error updating return status to validating:', returnUpdateError)
    // Tidak return error, karena history sudah tersimpan dengan sukses
  } else {
    console.log(`✅ Return ${dbReturnId} status updated to 'validating'`)
  }
}
```

**Trigger Condition**: `status === 'delivered'`
**Action**: Update `returns` table:
  - `status` → `'validating'`
  - `notes` → `'Barang sudah kami terima. Sedang dalam proses validasi.'`

### 2. UI Timeline Progress Bar
**File**: `src/app/user/purchase/page.tsx:2439`

**Before**:
```tsx
style={{width: submittedReturn?.return_waybill ? '50%' : submittedReturn?.status === 'approved' ? '25%' : '0%'}}
```

**After**:
```tsx
style={{width: submittedReturn?.status === 'validating' ? '75%' : submittedReturn?.return_waybill ? '50%' : submittedReturn?.status === 'approved' ? '25%' : '0%'}}
```

**Progress Stages**:
- `0%` → Status: pending (review)
- `25%` → Status: approved
- `50%` → Has return_waybill (shipment arranged)
- `75%` → Status: validating ✅ **NEW**
- `100%` → Status: completed (replacement shipped)

### 3. Timeline Step 4 Button (Sedang Divalidasi)
**File**: `src/app/user/purchase/page.tsx:2483-2495`

**Before**: Always disabled with gray icon
**After**: Active when `status === 'validating'`

```tsx
<button
  onClick={() => updateTimelineUrl('validation')}
  className={`... ${submittedReturn?.status === 'validating' ? 'cursor-pointer ...' : 'cursor-not-allowed opacity-60'}`}
  disabled={submittedReturn?.status !== 'validating'}
>
  <div className={`w-10 h-10 rounded-full ... ${
    submittedReturn?.status === 'validating' ? 'bg-red-600' : 'bg-gray-200'
  }`}>
    <svg>
      {/* Check circle icon - white when active */}
      <path stroke={submittedReturn?.status === 'validating' ? 'white' : '#9CA3AF'} .../>
    </svg>
  </div>
  <p className={`... ${submittedReturn?.status === 'validating' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
    Sedang<br/>Divalidasi
  </p>
</button>
```

### 4. Validation Timeline Content
**File**: `src/app/user/purchase/page.tsx:2938-3027`

Menampilkan 3 komponen utama:

#### A. Info Card dengan Icon Cek ✅
```tsx
<div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
  <div className="flex gap-3">
    {/* Icon Cek Hijau */}
    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
      <svg>✓</svg>
    </div>

    <div>
      <h4>Barang sudah kami terima</h4>
      <p>Kami memerlukan waktu untuk validasi barang,
         biasanya memerlukan waktu kurang dari 1 hari.</p>
    </div>
  </div>
</div>
```

#### B. Card Status Pengiriman Return
```tsx
<div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
  <h4>Status Pengiriman Return</h4>

  {/* Tracking Timeline */}
  <div className="space-y-3">
    {returnShippingHistory.map((history, index) => {
      const isDelivered = history.biteship_status === 'delivered';
      const isLatest = index === 0;

      return (
        <div className="flex gap-3">
          {/* Dot indicator */}
          <div className={`w-3 h-3 rounded-full ${
            isDelivered ? 'bg-green-600' :  // Green for delivered
            isLatest ? 'bg-red-600' :       // Red for latest
            'bg-gray-400'                   // Gray for others
          }`}></div>

          {/* Status info */}
          <div>
            <p>{history.status_display}</p>
            <p className="text-[10px]">{formatDate(history.created_at)}</p>
            {history.note && <p>{history.note}</p>}
          </div>
        </div>
      )
    })}
  </div>

  {/* Nomor Resi & Kurir */}
  <div className="mt-4 pt-3 border-t">
    <div className="flex justify-between">
      <div>
        <p className="text-[10px]">No. Resi</p>
        <p className="text-xs font-semibold">{submittedReturn.return_waybill}</p>
      </div>
      <div>
        <p className="text-[10px]">Kurir</p>
        <p className="text-xs font-semibold uppercase">{submittedReturn.return_courier}</p>
      </div>
    </div>
  </div>
</div>
```

#### C. Product List Card
(Already exists below the validation content, displayed for all timeline steps)

## Database Schema

### returns table
- `status` field possible values:
  - `pending` - Waiting for admin review
  - `approved` - Approved, waiting for user to arrange shipping
  - `validating` - ✅ **NEW** - Product received, being validated
  - `completed` - Validation done, replacement shipped
  - `rejected` - Return request rejected

### return_shipping_history table
Stores all tracking updates from Biteship webhook:
- `return_id` - FK to returns.id
- `biteship_status` - Original status from Biteship (e.g., "delivered")
- `status_display` - Mapped to Indonesian (e.g., "Terkirim")
- `courier_waybill_id` - Tracking number
- `courier_company` - Courier name (e.g., "sicepat")
- `created_at`, `updated_at` - Auto timestamps

## Testing

### Test 1: Simulate Webhook Processing
```bash
node test_delivered_webhook.js
```

**Result**: ✅ PASS
```
Before: approved
After:  validating
Result: ✅ PASS
```

### Test 2: Real Webhook Endpoint
```bash
curl -X POST http://localhost:3000/api/biteship/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"order.status","courier_waybill_id":"WYB-1762513032476","status":"delivered"}'
```

**Result**: ✅ Success
```json
{"success": true, "message": "ok"}
```

**Database verification**:
```
Status: validating
Notes: Barang sudah kami terima. Sedang dalam proses validasi.
```

### Test 3: UI Display
**URL**: `http://localhost:3000/user/purchase?view=order-detail&order=DEV-T444563065427YKK8`

**Expected UI**:
1. ✅ Progress bar at 75%
2. ✅ Step 4 "Sedang Divalidasi" active with red icon
3. ✅ Green checkmark info card visible
4. ✅ "Status Pengiriman Return" card shows tracking history
5. ✅ Latest status "Terkirim" with green dot
6. ✅ Product list displayed below

## Webhook Event Sequence

### Typical Return Shipment Flow

```
1. Biteship: picking_up
   └─> return_shipping_history: "Kurir menuju lokasi penjemputan"
   └─> returns.status: approved (no change)

2. Biteship: picked
   └─> return_shipping_history: "Pesanan telah diserahkan ke jasa kirim"
   └─> returns.status: approved (no change)

3. Biteship: dropping_off
   └─> return_shipping_history: "Dalam Pengiriman"
   └─> returns.status: approved (no change)

4. Biteship: delivered ✅ TRIGGER
   └─> return_shipping_history: "Terkirim"
   └─> returns.status: validating ⚡ AUTO-UPDATE
   └─> returns.notes: "Barang sudah kami terima..."
   └─> UI Timeline Step 4: ACTIVATED
```

## Status Mapping (Biteship → Display)

| Biteship Status | Display (Indonesia) | Return Status Change |
|----------------|---------------------|---------------------|
| `confirmed` | Menunggu pesanan diserahkan ke pihak jasa kirim | - |
| `allocated` | Menunggu penjemputan kurir | - |
| `picking_up` | Kurir menuju lokasi penjemputan | - |
| `picked` | Pesanan telah diserahkan ke jasa kirim | - |
| `dropping_off` | Dalam Pengiriman | - |
| `delivered` | Terkirim | ✅ → `validating` |
| `cancelled` | Dibatalkan | - |
| `rejected` | Ditolak | - |

## Files Modified

### Backend
- ✅ `src/app/api/biteship/webhook/route.ts`
  - Lines 164-183: Auto-update return status logic

### Frontend
- ✅ `src/app/user/purchase/page.tsx`
  - Line 2439: Progress bar width calculation
  - Lines 2483-2495: Step 4 button activation logic
  - Lines 2938-3027: Validation timeline content

### Testing Scripts
- ✅ `test_delivered_webhook.js` - Simulate delivered webhook
- ✅ `test_return_webhook.js` - Test return webhook processing

### Documentation
- ✅ `AUTO_STATUS_UPDATE_VALIDATING.md` - This file
- ✅ `FIX_RETURN_WEBHOOK_ERROR.md` - Previous webhook fix

## Next Steps

### Optional Enhancements
1. **Email Notification**: Send email to user when status changes to `validating`
2. **Admin Dashboard**: Add validation UI for admin to approve/reject returns
3. **Auto-timeout**: Auto-complete validation after X hours if no action
4. **Photos Upload**: Allow admin to upload validation photos

### Future Status Flow
```
validating
  ├─> approved (validation passed) → arrange replacement shipment
  └─> rejected (validation failed) → notify user
```

## Rollback Instructions

If needed to rollback:

### 1. Remove Auto-Update from Webhook
```typescript
// Remove lines 164-183 in webhook/route.ts
// OR comment out the auto-update block
```

### 2. Revert UI Changes
```tsx
// Progress bar (line 2439):
style={{width: submittedReturn?.return_waybill ? '50%' : submittedReturn?.status === 'approved' ? '25%' : '0%'}}

// Step 4 button (lines 2483-2495):
<button disabled className="cursor-not-allowed opacity-60">
  <div className="bg-gray-200">...</div>
</button>

// Content (lines 2938-3027):
<div className="bg-gray-100 rounded-lg p-4 mb-6">
  <h4>Sedang Divalidasi</h4>
  <p>Barang Anda sedang dalam proses validasi...</p>
</div>
```

## Support

For issues or questions:
- Check webhook logs in Next.js console
- Verify return_shipping_history table has data
- Ensure return has `return_waybill` set
- Test webhook endpoint manually with curl

## Success Criteria ✅

- [x] Webhook automatically updates return status when delivered
- [x] Timeline step 4 activates when status = validating
- [x] Green checkmark info card displays
- [x] Status Pengiriman Return card shows tracking history
- [x] Product list displays below
- [x] Progress bar updates to 75%
- [x] All tests passing
- [x] No errors in console/logs
