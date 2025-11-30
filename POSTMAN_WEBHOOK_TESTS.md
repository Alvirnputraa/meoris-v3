# 🧪 Biteship Webhook Testing dengan Postman

## Setup Postman Collection

### Base URL
```
https://meoris.id/api/biteship/webhook
```

---

## Test 1: Installation Test (Empty Body)

**Method:** `POST`
**URL:** `https://meoris.id/api/biteship/webhook`

**Headers:**
```
Content-Type: application/json
```

**Body:** (Raw JSON)
```json
{}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "ok"
}
```

**Status Code:** `200 OK`

---

## Test 2: Order Status Update - Confirmed

**Method:** `POST`
**URL:** `https://meoris.id/api/biteship/webhook`

**Headers:**
```
Content-Type: application/json
X-Biteship-Signature: 938f77133ba36cc9d994e437daebf93aa396c38b3bb28ab1b1d6a88ace16cfae
```

**Body:** (Raw JSON)
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "courier_tracking_id": "BITESHIP-POSTMAN-TEST",
  "status": "confirmed",
  "courier_name": "JNE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "ok"
}
```

**Database Change:**
- `shipping_status` → "Pesanan Dikonfirmasi"

---

## Test 3: Order Status Update - Picking Up

**Method:** `POST`
**URL:** `https://meoris.id/api/biteship/webhook`

**Headers:**
```
Content-Type: application/json
X-Biteship-Signature: 938f77133ba36cc9d994e437daebf93aa396c38b3bb28ab1b1d6a88ace16cfae
```

**Body:** (Raw JSON)
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "courier_tracking_id": "BITESHIP-POSTMAN-TEST",
  "status": "picking_up",
  "courier_name": "JNE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "ok"
}
```

**Database Change:**
- `shipping_status` → "Sedang Dijemput"

---

## Test 4: Order Status Update - Picked

**Method:** `POST`
**URL:** `https://meoris.id/api/biteship/webhook`

**Headers:**
```
Content-Type: application/json
X-Biteship-Signature: 938f77133ba36cc9d994e437daebf93aa396c38b3bb28ab1b1d6a88ace16cfae
```

**Body:** (Raw JSON)
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "courier_tracking_id": "BITESHIP-POSTMAN-TEST",
  "status": "picked",
  "courier_name": "JNE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "ok"
}
```

**Database Change:**
- `shipping_status` → "Sudah Dijemput"

---

## Test 5: Order Status Update - Dropping Off

**Method:** `POST`
**URL:** `https://meoris.id/api/biteship/webhook`

**Headers:**
```
Content-Type: application/json
X-Biteship-Signature: 938f77133ba36cc9d994e437daebf93aa396c38b3bb28ab1b1d6a88ace16cfae
```

**Body:** (Raw JSON)
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "courier_tracking_id": "BITESHIP-POSTMAN-TEST",
  "status": "dropping_off",
  "courier_name": "JNE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "ok"
}
```

**Database Change:**
- `shipping_status` → "Dalam Pengiriman"

---

## Test 6: Order Status Update - Delivered

**Method:** `POST`
**URL:** `https://meoris.id/api/biteship/webhook`

**Headers:**
```
Content-Type: application/json
X-Biteship-Signature: 938f77133ba36cc9d994e437daebf93aa396c38b3bb28ab1b1d6a88ace16cfae
```

**Body:** (Raw JSON)
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "courier_tracking_id": "BITESHIP-POSTMAN-TEST",
  "status": "delivered",
  "courier_name": "JNE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "ok"
}
```

**Database Change:**
- `shipping_status` → "Terkirim"

---

## Test 7: Waybill ID Update

**Method:** `POST`
**URL:** `https://meoris.id/api/biteship/webhook`

**Headers:**
```
Content-Type: application/json
X-Biteship-Signature: 938f77133ba36cc9d994e437daebf93aa396c38b3bb28ab1b1d6a88ace16cfae
```

**Body:** (Raw JSON)
```json
{
  "event": "order.waybill_id",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "courier_waybill_id": "JNE-POSTMAN-TEST-12345",
  "courier_name": "JNE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "ok"
}
```

**Database Change:**
- `shipping_resi` → "JNE-POSTMAN-TEST-12345"

---

## Test 8: Multiple Status Updates (Realistic Flow)

Jalankan test ini secara berurutan untuk simulasi flow real:

### 8.1 - Order Confirmed
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "status": "confirmed"
}
```

### 8.2 - Kurir Allocated
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "status": "allocated"
}
```

### 8.3 - Resi Number Added
```json
{
  "event": "order.waybill_id",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "courier_waybill_id": "JNE9876543210"
}
```

### 8.4 - Picking Up
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "status": "picking_up"
}
```

### 8.5 - Picked
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "status": "picked"
}
```

### 8.6 - In Transit
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "status": "dropping_off"
}
```

### 8.7 - Delivered
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "status": "delivered"
}
```

---

## Test 9: GET Request (Health Check)

**Method:** `GET`
**URL:** `https://meoris.id/api/biteship/webhook`

**Headers:** (none required)

**Expected Response:**
```json
{
  "success": true,
  "message": "ok",
  "timestamp": "2025-11-01T07:00:00.000Z"
}
```

**Status Code:** `200 OK`

---

## Test 10: Invalid Signature (Security Test)

**Method:** `POST`
**URL:** `https://meoris.id/api/biteship/webhook`

**Headers:**
```
Content-Type: application/json
X-Biteship-Signature: invalid-signature-here
```

**Body:** (Raw JSON)
```json
{
  "event": "order.status",
  "order_id": "3ec29e32-b31f-405d-a45f-f725e8fe0ce6",
  "status": "confirmed"
}
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```

**Status Code:** `401 Unauthorized`

---

## Verification Steps

Setelah setiap test, verify dengan:

### 1. Check Database
```bash
node check_order_update.js
```

### 2. Check Order Page
Buka di browser:
```
https://meoris.id/produk/pesanan/3ec29e32-b31f-405d-a45f-f725e8fe0ce6
```

### 3. Check Logs (Production)
```bash
pm2 logs
```

---

## Import ke Postman

### Cara 1: Manual
1. Buat New Collection di Postman
2. Nama: "Biteship Webhook Tests"
3. Tambahkan requests dari dokumentasi di atas

### Cara 2: Import JSON
Saya bisa buatkan Postman Collection JSON jika diperlukan.

---

## Tips Postman

1. **Gunakan Environment Variables:**
   - `{{webhook_url}}` = `https://meoris.id/api/biteship/webhook`
   - `{{order_id}}` = `3ec29e32-b31f-405d-a45f-f725e8fe0ce6`
   - `{{signature}}` = `938f77133ba36cc9d994e437daebf93aa396c38b3bb28ab1b1d6a88ace16cfae`

2. **Gunakan Tests Tab:**
   ```javascript
   pm.test("Status is 200", function () {
       pm.response.to.have.status(200);
   });

   pm.test("Response has success", function () {
       var jsonData = pm.response.json();
       pm.expect(jsonData.success).to.eql(true);
   });
   ```

3. **Gunakan Pre-request Script:**
   ```javascript
   // Auto-generate timestamp
   pm.environment.set("timestamp", new Date().toISOString());
   ```

---

## Status Mapping Reference

| Biteship Status | Database Status (Indonesia) |
|----------------|----------------------------|
| `confirmed` | Pesanan Dikonfirmasi |
| `allocated` | Kurir Dialokasikan |
| `picking_up` | Sedang Dijemput |
| `picked` | Sudah Dijemput |
| `dropping_off` | Dalam Pengiriman |
| `delivered` | Terkirim |
| `cancelled` | Dibatalkan |
| `rejected` | Ditolak |
| `returned` | Dikembalikan |
| `on_hold` | Ditahan |

---

## Troubleshooting

### Error: "Missing order_id"
- Pastikan body request punya field `order_id`
- Order ID harus UUID yang valid dari database

### Error: "Unauthorized"
- Check header `X-Biteship-Signature`
- Pastikan value sama dengan webhook secret

### Response 500
- Check application logs di server
- Pastikan database connection OK
- Verify order ID exists

---

## Ready to Test!

1. Buka Postman
2. Create New Request
3. Copy salah satu test dari atas
4. Click Send
5. Verify response dan database

Happy Testing! 🚀
