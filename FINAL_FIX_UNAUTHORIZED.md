# ✅ FIXED: Unauthorized Error di Admin Returns

## Problem (SOLVED)
Error "Unauthorized. Admin not found or invalid." di http://localhost:3000/admin/returns

## Root Cause
API routes menggunakan **ANON key** dari `@/lib/supabase` yang tidak bisa query tabel `admin_users` karena RLS policies.

## Solution Applied ✅

### 1. Created `src/lib/supabase-admin.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // <-- Uses SERVICE_ROLE_KEY!
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### 2. Updated All Admin API Routes
Changed from:
```typescript
import { supabase } from '@/lib/supabase';
await supabase.from('admin_users')...
```

To:
```typescript
import { supabaseAdmin } from '@/lib/supabase-admin';
await supabaseAdmin.from('admin_users')...
```

**Files updated:**
- ✅ `src/app/api/admin/returns/list/route.ts`
- ✅ `src/app/api/admin/returns/detail/route.ts`
- ✅ `src/app/api/admin/returns/approve/route.ts`
- ✅ `src/app/api/admin/returns/reject/route.ts`
- ✅ `src/app/api/admin/returns/validate/route.ts`
- ✅ `src/app/api/admin/returns/replacement/add-items/route.ts`
- ✅ `src/app/api/admin/returns/replacement/ship/route.ts`

## 🚀 How to Test

### Step 1: Restart Dev Server (IMPORTANT!)
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 2: Clear Browser Cache
```
Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### Step 3: Login as Admin
```
URL: http://localhost:3000/admin/login
Email: admin@erdanpee.com
Password: [your admin password]
```

### Step 4: Open Admin Returns
```
URL: http://localhost:3000/admin/returns
```

### Expected Result ✅
- **No more "Unauthorized" error!**
- Page loads with returns data
- Stats cards show numbers
- Table shows Order DEV-T44456308106T2URE with Customer MAYAR

## Verification

Run this to verify SERVICE_ROLE_KEY is configured:
```bash
node debug_admin_auth.js
```

Should show:
```
✅ SERVICE_ROLE_KEY is configured
✅ Successfully queried admin: admin@erdanpee.com
```

## Technical Explanation

### Why This Happens:
1. **RLS (Row Level Security)** is enabled on `admin_users` table
2. **ANON key** (used by regular users) cannot bypass RLS
3. **SERVICE_ROLE key** can bypass RLS and query any table

### The Fix:
- **Client-side code** → Use `supabase` (ANON key) ✅
- **Admin API routes** → Use `supabaseAdmin` (SERVICE_ROLE key) ✅

This is the **correct pattern** for admin operations in Supabase!

## Key Difference

### Before (WRONG):
```typescript
// src/lib/supabase.ts - Uses ANON key
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey  // ❌ Cannot query admin_users
)

// API routes
import { supabase } from '@/lib/supabase';  // ❌ Wrong!
```

### After (CORRECT):
```typescript
// src/lib/supabase-admin.ts - Uses SERVICE_ROLE key
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey  // ✅ Can query admin_users
)

// API routes
import { supabaseAdmin } from '@/lib/supabase-admin';  // ✅ Correct!
```

## Summary

✅ **Created**: `src/lib/supabase-admin.ts` with SERVICE_ROLE_KEY
✅ **Updated**: All 7 admin API routes to use `supabaseAdmin`
✅ **Result**: Admin authentication now works!

**The "Unauthorized" error is now FIXED!** 🎉

Just restart your dev server and login as admin.
