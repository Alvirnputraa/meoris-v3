@echo off
REM =====================================================
REM VIEW VERCEL LOGS - WINDOWS
REM =====================================================
REM Install Vercel CLI first: npm install -g vercel
REM =====================================================

echo.
echo ========================================
echo VERCEL LOGS - AUTO CANCEL CRON JOB
echo ========================================
echo.

REM Login to Vercel (if not logged in)
echo Step 1: Login to Vercel...
vercel login

echo.
echo Step 2: Viewing logs for auto-cancel-pending-orders...
echo.

REM View logs for the cron function
vercel logs --follow

echo.
echo ========================================
echo Press Ctrl+C to stop viewing logs
echo ========================================
echo.
