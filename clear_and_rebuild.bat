@echo off
echo ================================================
echo CLEAR CACHE DAN REBUILD APLIKASI
echo ================================================
echo.

echo [1/4] Stopping Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/4] Removing .next directory...
if exist ".next" (
    rmdir /s /q ".next"
    echo .next directory removed successfully
) else (
    echo .next directory not found, skipping...
)

echo.
echo [3/4] Building application...
call npm run build

echo.
echo [4/4] Starting development server...
echo.
echo ================================================
echo Dev server akan jalan di: http://localhost:3000
echo ================================================
echo.
call npm run dev
