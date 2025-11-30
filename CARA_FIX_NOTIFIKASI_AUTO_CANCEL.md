# Cara Memperbaiki Notifikasi Auto-Cancel

## Masalah
Notifikasi auto-cancel menampilkan:
```
Pesanan dibatalkan
Pesanan dengan nomor DEV-T44456310236QGWZ1 telah dibatalkan karena melewati batas waktu pembayaran.
```

Seharusnya:
```
Pesanan dibatalkan
Pesanan anda dengan id pesanan 7E71CCAE13 telah dibatalkan karena telah melewati batas waktu pembayaran.
```

## Solusi

### Langkah 1: Buka Supabase Dashboard
1. Pergi ke [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Pilih project Meoris
3. Klik **SQL Editor** di sidebar kiri

### Langkah 2: Jalankan SQL Fix
1. Copy seluruh isi file: `fix_auto_cancel_notification_message.sql`
2. Paste di SQL Editor
3. Klik tombol **Run** (atau tekan Ctrl+Enter)

### Langkah 3: Verifikasi
Jalankan query ini untuk memastikan function sudah ter-update:
```sql
SELECT prosrc
FROM pg_proc
WHERE proname = 'auto_cancel_pending_orders';
```

Pastikan message-nya sekarang berbunyi:
```
'Pesanan anda dengan id pesanan ' || v_order_record.id || ' telah dibatalkan karena telah melewati batas waktu pembayaran.'
```

## Testing

### Test dengan Notifikasi Baru
Untuk test, bisa jalankan:
```sql
-- Buat order test yang sudah expired
INSERT INTO orders (id, user_id, status, created_at)
VALUES ('TEST-123', 'USER_ID_ANDA', 'pending', NOW() - INTERVAL '25 hours');

-- Jalankan function auto-cancel
SELECT * FROM auto_cancel_pending_orders();

-- Check notifikasi yang dibuat
SELECT * FROM notifications
WHERE order_id = 'TEST-123'
ORDER BY created_at DESC
LIMIT 1;
```

Notifikasi seharusnya menampilkan message:
```
Pesanan anda dengan id pesanan TEST-123 telah dibatalkan karena telah melewati batas waktu pembayaran.
```

### Cleanup Test Data
```sql
DELETE FROM notifications WHERE order_id = 'TEST-123';
DELETE FROM orders WHERE id = 'TEST-123';
```

## File yang Sudah Diperbaiki
✅ `create_auto_cancel_pending_orders_function.sql` (line 63)
✅ `fix_auto_cancel_notification_message.sql` (file baru untuk apply fix)

## Catatan Penting
- Fix ini hanya berlaku untuk **notifikasi baru** yang dibuat setelah function di-update
- Notifikasi lama (seperti yang untuk order 7E71CCAE13) tidak akan berubah
- Jika ingin update notifikasi lama, bisa jalankan:
  ```sql
  UPDATE notifications
  SET message = 'Pesanan anda dengan id pesanan ' || order_id || ' telah dibatalkan karena telah melewati batas waktu pembayaran.'
  WHERE type = 'order_cancelled'
    AND message NOT LIKE '%karena telah melewati batas waktu pembayaran%';
  ```
