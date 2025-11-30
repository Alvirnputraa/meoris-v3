# Implementasi Fitur Permintaan Pengembalian (Return Request)

## Overview
Fitur ini memungkinkan user untuk mengajukan permintaan pengembalian barang setelah menerima pesanan mereka.

## Database Schema

### Tabel: `returns`

Tabel sudah ada dengan struktur lengkap:

```sql
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number TEXT,
  reason TEXT NOT NULL,
  description TEXT,
  photo_paths TEXT[] DEFAULT '{}',
  video_paths TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  -- Return shipping columns
  return_shipping_method TEXT,
  return_shipping_scheduled_at TIMESTAMPTZ,
  dropoff_deadline TIMESTAMPTZ,
  shipping_arranged BOOLEAN DEFAULT FALSE,
  arranged_at TIMESTAMPTZ,
  return_courier TEXT,
  return_courier_service TEXT,
  return_waybill TEXT
);
```

### Status Values
- `pending` - Menunggu persetujuan admin
- `approved` - Disetujui, menunggu pengaturan pengiriman
- `rejected` - Ditolak
- `in_transit` - Dalam pengiriman kembali ke seller
- `completed` - Selesai

## Setup Requirements

### 1. Supabase Storage Bucket

Jalankan SQL berikut untuk membuat storage bucket:

```bash
# Run this SQL file in Supabase SQL Editor
setup_returns_storage_bucket.sql
```

### 2. Environment Variables

Pastikan `.env` sudah memiliki:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## API Endpoint

### POST `/api/returns/submit`

**Request (FormData):**
- `orderId` (string, required) - UUID pesanan
- `userId` (string, required) - UUID user
- `reason` (string, required) - Alasan pengembalian
- `description` (string, required) - Deskripsi detail
- `videoLink` (string, optional) - URL video unboxing
- `photos` (File[], optional) - Array file foto produk

**Response Success (200):**
```json
{
  "success": true,
  "message": "Pengajuan pengembalian berhasil dikirim",
  "data": {
    "id": "uuid",
    "status": "pending",
    ...
  }
}
```

**Response Error (400/404/500):**
```json
{
  "error": "Error message"
}
```

## Frontend Integration

### Form Fields
1. **Order Number** - Auto-populated dari order yang dipilih
2. **Alasan Pengembalian** - Dropdown dengan opsi:
   - Produk cacat/rusak
   - Ukuran tidak sesuai
   - Warna tidak sesuai
   - Barang tidak sesuai deskripsi
   - Lainnya
3. **Deskripsi** - Textarea untuk detail pengembalian
4. **Foto Produk** - Upload multiple images (max 5)
5. **Link Video Unboxing** - Optional URL input

### Usage in Page

File: `src/app/user/purchase/page.tsx`

```typescript
// State management
const [returnReason, setReturnReason] = useState('');
const [returnDescription, setReturnDescription] = useState('');
const [returnImages, setReturnImages] = useState<File[]>([]);
const [returnVideoLink, setReturnVideoLink] = useState('');

// Submit handler
const handleSubmitReturn = async () => {
  // Validation
  // Prepare FormData
  // Call API
  // Handle response
};
```

## Validations

### Frontend Validations
- Reason: Required
- Description: Required
- Photos: Maximum 5 files, max 5MB each
- Video Link: Valid URL format (if provided)

### Backend Validations
- Order must exist and belong to user
- No duplicate return request for same order (unless previous was rejected)
- User must be authenticated
- File upload size limits enforced by Supabase

## User Flow

1. User goes to `/user/purchase?view=order-detail&order={orderId}`
2. Click button "Ajukan Pengembalian"
3. Return form slides in
4. Fill form:
   - Select reason
   - Enter description
   - Upload photos (optional)
   - Add video link (optional)
5. Click "Kirim Pengajuan"
6. System validates and submits
7. Photos uploaded to Supabase Storage bucket `returns`
8. Return record created in database with status `pending`
9. Success message shown
10. Form closes and orders list refreshed

## Admin Flow (Future Enhancement)

Admin dapat:
1. Melihat list return requests di admin panel
2. Approve/reject requests
3. View photos and video
4. Add notes
5. Update status

## Testing

### Manual Test Steps

1. **Setup Database:**
   ```bash
   # Run in Supabase SQL Editor
   psql < create_returns_table.sql
   psql < add_return_shipping_columns.sql
   psql < alter_returns_add_waybill.sql
   psql < setup_returns_storage_bucket.sql
   ```

2. **Test Submission:**
   - Login as user
   - Navigate to an order
   - Click "Ajukan Pengembalian"
   - Fill all required fields
   - Upload 2-3 photos
   - Add video link
   - Submit
   - Check database for new return record
   - Verify photos uploaded to storage

3. **Test Validations:**
   - Try submit without reason (should fail)
   - Try submit without description (should fail)
   - Try submit duplicate return for same order (should fail)
   - Try upload > 5 photos (should be blocked)

## Files Modified/Created

### Created:
- `src/app/api/returns/submit/route.ts` - API endpoint
- `setup_returns_storage_bucket.sql` - Storage setup
- `RETURN_REQUEST_IMPLEMENTATION.md` - This documentation

### Modified:
- `src/app/user/purchase/page.tsx` - Updated handleSubmitReturn function
- Form labels updated:
  - "Form Pengajuan Pengembalian" → "Permintaan Pengembalian"
  - "Link Video (Opsional)" → "Link Video Unboxing"
  - Placeholder: "Taruh link video unboxing anda disini"

## Security Considerations

1. **Authentication**: User must be logged in
2. **Authorization**: User can only submit returns for their own orders
3. **File Upload**:
   - Validated file types (images only)
   - Size limits enforced
   - Uploaded to isolated storage bucket
4. **RLS Policies**: Enforced on storage bucket
5. **Input Sanitization**: All text inputs sanitized

## Future Enhancements

1. Email notifications when return status changes
2. Admin dashboard for managing returns
3. Return shipping label generation
4. Automatic refund processing
5. Return tracking integration
6. Chat system for return discussions
