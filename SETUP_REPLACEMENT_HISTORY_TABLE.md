# Setup return_replacement_history Table

## Error yang Muncul
```
Error loading replacement shipping history: {}
```

## Penyebab
Tabel `return_replacement_history` mungkin belum ada atau RLS policy belum di-setup dengan benar.

## Solusi

### Langkah 1: Cek apakah tabel sudah ada

Jalankan SQL ini di Supabase SQL Editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'return_replacement_history';
```

**Jika hasil kosong:** Tabel belum ada, lanjut ke Langkah 2
**Jika hasil muncul:** Tabel sudah ada, lanjut ke Langkah 3

---

### Langkah 2: Buat Tabel (jika belum ada)

Tabel ini seharusnya sudah dibuat dari `create_replacement_system.sql`. Jika belum, jalankan:

```sql
-- Create return_replacement_history table
CREATE TABLE IF NOT EXISTS return_replacement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES returns(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  courier TEXT,
  waybill TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_return_replacement_history_return_id
ON return_replacement_history(return_id);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_return_replacement_history_updated_at
ON return_replacement_history(updated_at DESC);
```

---

### Langkah 3: Setup RLS Policy

Jalankan SQL di file `fix_replacement_history_rls.sql`:

```sql
-- Enable RLS
ALTER TABLE return_replacement_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view replacement history for their returns" ON return_replacement_history;

-- Create policy: Users can view their own replacement history
CREATE POLICY "Users can view replacement history for their returns"
ON return_replacement_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM returns
    WHERE returns.id = return_replacement_history.return_id
    AND returns.user_id = auth.uid()
  )
);
```

---

### Langkah 4: Verifikasi

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'return_replacement_history';
-- Should show: rowsecurity = true

-- Check policy exists
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'return_replacement_history';
-- Should show 1 policy
```

---

### Langkah 5: Test dari Browser

1. Refresh halaman replacement timeline
2. Error seharusnya hilang
3. Console log seharusnya menunjukkan:
   ```
   Replacement shipping history loaded: 0 records
   ```
   (0 adalah normal jika memang belum ada data tracking)

---

## Data Flow

```
Admin approves return (status = validating)
  ↓
Admin fills replacement products
  ↓
Admin selects courier & clicks ship
  ↓
Biteship webhook creates record in return_replacement_history
  ↓
User sees tracking in timeline replacement
```

## Expected Behavior

**Jika belum ada data tracking:**
- UI menampilkan: "Tracking sedang dimuat..."
- Console: "Replacement shipping history loaded: 0 records"
- ❌ TIDAK ADA ERROR

**Jika sudah ada data tracking:**
- UI menampilkan timeline dengan status & timestamp
- Console: "Replacement shipping history loaded: X records"

---

## Files Created

1. `fix_replacement_history_rls.sql` - SQL untuk setup RLS policy
2. `check_replacement_history_table.sql` - SQL untuk check tabel
3. `test_replacement_history_access.js` - Script untuk test access
4. `SETUP_REPLACEMENT_HISTORY_TABLE.md` - Dokumentasi ini

---

## Troubleshooting

### Error masih muncul setelah apply RLS
- Pastikan user sudah login (auth session active)
- Cek apakah return_id valid
- Cek apakah return.user_id = auth.uid()

### Data tidak muncul meskipun sudah ada di database
- Cek RLS policy dengan query sebagai authenticated user
- Test dengan service role key (bypasses RLS)

### "Tracking sedang dimuat..." terus menerus
- Normal jika memang belum ada data
- Akan terisi otomatis ketika Biteship webhook dipanggil
- Admin bisa trigger webhook dengan test shipping update
