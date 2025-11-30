#!/bin/bash
# =====================================================
# MANUAL TRIGGER AUTO-CANCEL VIA API
# =====================================================
# Jalankan ini SETELAH JAM 11:00 WIB untuk test
# =====================================================

echo ""
echo "========================================"
echo "TESTING AUTO-CANCEL PENDING ORDERS"
echo "========================================"
echo ""
echo "Target: DEV-T44456309244UZ9WI"
echo "Deadline: 17 November 2025 pukul 11:00 WIB"
echo ""

# Get current time
echo "Current time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Call API endpoint (tanpa auth untuk test)
echo "Calling auto-cancel API endpoint..."
echo ""

curl -X GET "https://meoris.id/api/cron/auto-cancel-pending-orders" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "========================================"
echo "DONE! Check the response above"
echo "========================================"
echo ""
