# Home Page Double Loading Issue

## 🐛 Problem

User mengalami loading 2 kali ketika login dan diarahkan ke homepage:
1. Login success → redirect ke `/home`
2. `/home` tampil loading (Lottie animation)
3. Setelah 800ms → redirect ke `/`
4. `/` (main homepage) tampil loading lagi (menunggu data)

**Total loading time:** ~2-3 detik (feels slow)

---

## 🔍 Root Causes

### Cause 1: Double Redirect ⚠️
**File:** `src/app/home/page.tsx:10-14`

```typescript
useEffect(() => {
  // Show splash briefly, then redirect to main homepage
  const t = setTimeout(() => router.replace('/'), 800);
  return () => clearTimeout(t);
}, [router]);
```

**Problem:**
- `/home` adalah splash page yang hanya menampilkan loading
- Setelah 800ms, redirect ke `/` (root)
- User melihat 2 page transitions

---

### Cause 2: Slow Data Loading
**File:** `src/app/page.tsx:282-311`

Page menunggu **4 data sources** sebelum ready:
```typescript
const productsReady = !pageLoading && (pageItems.length > 0 || page > 0);
const latestReady = !latestLoading && (latest.length > 0 || latest.length === 0);
const flashSaleReady = !flashSaleLoading;
const dealsReady = !dealsLoading;
```

**If any of these is slow:**
- Products API
- Latest products API
- Flash sale config
- Deals/promotions

**Result:** User sees loading screen longer

---

## ✅ Solutions

### Solution 1: Remove Splash Page (RECOMMENDED) ⭐

**Change login redirect from `/home` to `/`:**

**File:** `src/app/login/page.tsx:202`
```typescript
// Already correct! ✅
await login(email, password)
router.push('/')  // Goes directly to main page
```

**Problem:** Mungkin ada redirect lain ke `/home`

**Action:** Check all redirects and remove `/home` references

**Benefits:**
- ✅ Eliminate 800ms splash delay
- ✅ One loading screen instead of two
- ✅ Faster perceived load time

---

### Solution 2: Optimize Data Loading ⚡

#### A. Progressive Loading (Show UI First)
```typescript
// Don't wait for ALL data, show UI progressively
useEffect(() => {
  const checkPageReady = () => {
    // Page ready when MINIMUM data is available
    const minimalReady = !pageLoading && pageItems.length > 0;

    if (minimalReady) {
      setIsPageReady(true);  // Show page immediately
      // Other data loads in background
    }
  };

  checkPageReady();
}, [pageLoading, pageItems.length]);
```

**Benefits:**
- ✅ Show page with minimal data
- ✅ Load other sections progressively
- ✅ Faster initial render

---

#### B. Parallel Data Fetching
```typescript
// Fetch all data in parallel, not sequential
useEffect(() => {
  Promise.all([
    fetchProducts(),
    fetchLatest(),
    fetchFlashSale(),
    fetchDeals()
  ]).then(() => {
    setIsPageReady(true);
  });
}, []);
```

**Benefits:**
- ✅ All requests at same time
- ✅ Total time = slowest request (not sum of all)

---

#### C. Add Timeout (Fallback)
```typescript
useEffect(() => {
  // Force page ready after 2 seconds even if data not loaded
  const timeout = setTimeout(() => {
    if (!isPageReady) {
      console.warn('Page load timeout, showing page anyway');
      setIsPageReady(true);
    }
  }, 2000);

  return () => clearTimeout(timeout);
}, [isPageReady]);
```

**Benefits:**
- ✅ Guaranteed max loading time
- ✅ Prevent infinite loading
- ✅ Better UX even with slow API

---

### Solution 3: Skeleton Loading (Best UX) 🎨

Instead of full-screen loader, show skeleton UI:

```tsx
{showLoader ? (
  // OLD: Full screen spinner
  <div>Loading...</div>
) : (
  // Content
)}

// NEW: Skeleton UI
<div>
  {!productsReady && <ProductSkeleton />}
  {!flashSaleReady && <FlashSaleSkeleton />}
  {!dealsReady && <DealsSkeleton />}

  {productsReady && <ProductsSection />}
  {flashSaleReady && <FlashSaleSection />}
  {dealsReady && <DealsSection />}
</div>
```

**Benefits:**
- ✅ Show page structure immediately
- ✅ Load content progressively
- ✅ Much better perceived performance

---

## 🚀 Quick Fix (Immediate)

### Step 1: Check Login Redirect
```bash
# Make sure login goes to "/" not "/home"
# File: src/app/login/page.tsx:202
router.push('/')  # ✅ Correct
```

### Step 2: Optional - Delete Splash Page
```bash
# If /home splash is not needed, consider removing it
# Or update to redirect immediately (0ms instead of 800ms)
```

### Step 3: Add Loading Timeout
Add this to `src/app/page.tsx` after line 311:

```typescript
// Force page ready after 2 seconds maximum
useEffect(() => {
  const maxLoadTime = setTimeout(() => {
    if (!isPageReady) {
      console.warn('[Performance] Max load time reached, showing page');
      setIsPageReady(true);
    }
  }, 2000);

  return () => clearTimeout(maxLoadTime);
}, [isPageReady]);
```

**Result:** Max loading time guaranteed to be ≤ 2 seconds

---

## 📊 Performance Comparison

| Scenario | Before | After (Quick Fix) | Improvement |
|----------|--------|-------------------|-------------|
| **Splash delay** | 800ms | 0ms | ✅ -800ms |
| **Max load time** | Unlimited | 2000ms | ✅ Capped |
| **Total** | 2-5 sec | 1-2 sec | ✅ 50-60% faster |

---

## 🧪 Testing

### Test Case 1: Login Redirect
```
1. Logout
2. Login with valid credentials
3. Check:
   ✅ Should go directly to main page (/)
   ❌ Should NOT go to /home first
   ✅ Should see loading once
```

### Test Case 2: Direct Access
```
1. Type in URL: http://localhost:3000/home
2. Check:
   ✅ Should show splash for 800ms
   ✅ Then redirect to /
   ❌ This is expected (splash page design)
```

### Test Case 3: Slow Network
```
1. Open Dev Tools (F12)
2. Network tab → Throttling → Slow 3G
3. Refresh page
4. Check:
   ✅ Page should show within 2 seconds
   ✅ Even if some data not loaded
```

---

## 💡 Recommendations

### Immediate (Do Now):
1. ✅ Verify login redirects to `/` not `/home`
2. ✅ Add 2-second max load timeout
3. ✅ Test perceived performance

### Short Term (This Week):
1. 🔄 Implement progressive loading
2. 🔄 Add skeleton screens
3. 🔄 Optimize API calls (caching, parallel)

### Long Term (Next Sprint):
1. 🎯 Remove splash page entirely
2. 🎯 Implement service worker for offline
3. 🎯 Add prefetching for common routes

---

## 🐛 Debug Commands

### Check Current Load Time:
```javascript
// Add to page.tsx
console.time('Page Load');
// ... at end of page ready
console.timeEnd('Page Load');
```

### Monitor Each Data Source:
```javascript
useEffect(() => {
  console.log('[Load Time] Products:', !pageLoading);
  console.log('[Load Time] Latest:', !latestLoading);
  console.log('[Load Time] Flash Sale:', !flashSaleLoading);
  console.log('[Load Time] Deals:', !dealsLoading);
}, [pageLoading, latestLoading, flashSaleLoading, dealsLoading]);
```

### Test Without Specific Data:
```javascript
// Temporarily skip slow data to identify bottleneck
const productsReady = true;  // Force ready
const latestReady = !latestLoading;
const flashSaleReady = !flashSaleLoading;
const dealsReady = !dealsLoading;
```

---

## 📝 Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `src/app/page.tsx` | Add 2s timeout | 🔴 High |
| `src/app/home/page.tsx` | Reduce delay or remove | 🟡 Medium |
| `src/app/login/page.tsx` | Verify redirects to `/` | 🟢 Low (already ok) |

---

## ✅ Summary

**Root Cause:**
1. Double redirect (`/home` → `/`)
2. Waiting for all data before showing page

**Quick Fix:**
1. Ensure direct redirect to `/`
2. Add 2-second max load timeout
3. Consider skeleton loading

**Expected Result:**
- Loading time reduced by 50-60%
- Better perceived performance
- Consistent load time (≤2s)

---

**Status:** 🔍 Diagnosed
**Solution:** ✅ Ready to implement
**Impact:** 🚀 High (perceived performance)
