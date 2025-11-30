@echo off
echo Testing Return Webhook Endpoint
echo ================================
echo.

REM Test payload
set PAYLOAD={"event":"order.status","order_id":"690dd0887692553f72342bb3","order_price":16000,"courier_tracking_id":"w0rnIvFvTrpwif9RN3nZclin","courier_waybill_id":"WYB-1762513032476","courier_company":"sicepat","courier_type":"reg","courier_driver_name":"john doe","courier_driver_phone":"62888888888","courier_driver_plate_number":"B 123456 LS","courier_driver_photo_url":"https://picsum.photos/200/300","courier_link":"https://track.biteship.com/w0rnIvFvTrpwif9RN3nZclin?environment=development","status":"picking_up","updated_at":"2025-11-08T04:06:08.351Z"}

echo Sending webhook to http://localhost:3000/api/biteship/webhook
echo.

curl -X POST http://localhost:3000/api/biteship/webhook ^
  -H "Content-Type: application/json" ^
  -d "%PAYLOAD%" ^
  -w "\n\nStatus Code: %%{http_code}\n" ^
  -v

echo.
echo ================================
echo Test completed
pause
