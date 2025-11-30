@echo off
REM =====================================================
REM MANUAL TRIGGER AUTO-CANCEL VIA API
REM =====================================================
REM Jalankan ini SETELAH JAM 11:00 WIB untuk test
REM =====================================================

echo.
echo ========================================
echo TESTING AUTO-CANCEL PENDING ORDERS
echo ========================================
echo.
echo Target: DEV-T44456309244UZ9WI
echo Deadline: 17 November 2025 pukul 11:00 WIB
echo.

REM Get current time
echo Current time: %date% %time%
echo.

REM Call API endpoint
echo Calling auto-cancel API endpoint...
echo.

curl -X GET "https://meoris.id/api/cron/auto-cancel-pending-orders" ^
  -H "Authorization: Bearer %CRON_SECRET%" ^
  -H "Content-Type: application/json" ^
  -v

echo.
echo ========================================
echo DONE! Check the response above
echo ========================================
echo.
pause
