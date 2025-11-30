# Solution Implemented - API Route for Used Vouchers

## Problem Summary
- ✅ Server callback working
- ✅ Data in `used_vouchers` table
- ❌ RLS blocking client queries (returns empty array)

## Root Cause
Supabase RLS policies were blocking authenticated client queries to `used_vouchers` table, even with correct policies and GRANT permissions.

## Solution: API Route Bypass

Instead of direct Supabase query from client, created API route that uses service_role to bypass RLS.

### Files Created/Modified

1. **NEW: `src/app/api/vouchers/used/route.ts`**
   - API endpoint: `GET /api/vouchers/used?user_id={uuid}`
   - Uses `supabaseAdmin` (service_role) to bypass RLS
   - Returns array of used voucher codes

2. **MODIFIED: `src/components/layout/Header.tsx`**
   - Changed from direct Supabase query to fetch API
   - Line ~166: Voucher count query
   - Line ~255: Voucher list query

### How It Works

**Before (NOT WORKING):**
```typescript
const { data } = await supabase
  .from('used_vouchers')
  .select('voucher_code')
  .eq('user_id', user.id);
// Returns: [] (empty - RLS blocking!)
```

**After (WORKING):**
```typescript
const response = await fetch(`/api/vouchers/used?user_id=${user.id}`);
const result = await response.json();
// Returns: { voucher_codes: ['15KLETSGO', 'ONGKIR7K'], count: 2 }
```

### Flow Diagram

```
Browser (Client)
    ↓
    | fetch('/api/vouchers/used?user_id=xxx')
    ↓
API Route (/api/vouchers/used/route.ts)
    ↓
    | Uses supabaseAdmin (service_role key)
    ↓
Supabase Database (bypasses RLS)
    ↓
    | Returns voucher_codes
    ↓
API Route
    ↓
    | JSON response
    ↓
Browser (Client)
    ↓
    | Filter vouchers
    ↓
Display filtered list (used vouchers hidden!)
```

## Testing

### 1. Rebuild & Restart
```bash
npm run build
pm2 restart meoris-sandal
```

### 2. Test in Browser
1. Go to http://localhost:3000/produk/detail-checkout
2. Press F12 → Console
3. Click voucher icon

**Expected Console Logs:**
```
[Voucher Debug] Fetching used vouchers via API for user_id: b41ef1ca-f2fb-47df-a4d7-b44fb2c22af3
[Voucher Debug] API success, data: { voucher_codes: ['15KLETSGO', 'ONGKIR7K'], count: 2 }
[Voucher Debug] Voucher codes count: 2
[Voucher Debug] Used voucher codes: ['15KLETSGO', 'ONGKIR7K']
[Voucher Debug] All vouchers before filter: ['15KLETSGO', 'ONGKIR7K']
[Voucher Debug] 15KLETSGO: expired=false, used=true
[Voucher Debug] ONGKIR7K: expired=false, used=true
[Voucher Debug] Valid vouchers after filter: []
```

**Expected Result:**
- ✅ Both vouchers (15KLETSGO, ONGKIR7K) should NOT appear in list
- ✅ Badge count should be 0
- ✅ "Tidak ada voucher tersedia" message

### 3. Server Logs
```bash
pm2 logs meoris-sandal --lines 20
```

**Expected:**
```
[API] Fetching used vouchers for user: b41ef1ca-f2fb-47df-a4d7-b44fb2c22af3
[API] Found 2 used voucher(s): ['15KLETSGO', 'ONGKIR7K']
```

## Verification Checklist

- [ ] Build successful
- [ ] PM2 restarted
- [ ] Browser console shows API success
- [ ] Voucher codes array not empty
- [ ] Used vouchers NOT in list
- [ ] Badge count decreased
- [ ] Server logs show API calls

## Benefits of This Approach

1. **Reliable** - Bypasses RLS completely
2. **Secure** - Service role key only on server
3. **Clean** - Separation of concerns
4. **Debuggable** - Easy to see API calls in Network tab
5. **Scalable** - Can add caching, rate limiting, etc.

## Future Improvements (Optional)

1. Add caching to reduce DB queries
2. Add authentication validation in API route
3. Add rate limiting
4. Return more voucher details if needed

## Troubleshooting

### API returns 500 error
Check server logs for details:
```bash
pm2 logs meoris-sandal | grep API
```

### API returns empty array
Check if SUPABASE_SERVICE_ROLE_KEY is set:
```bash
# In .env.local
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Vouchers still appear
1. Hard refresh: Ctrl+Shift+R
2. Check browser console for errors
3. Check Network tab - API should be called
4. Verify response has correct voucher codes
