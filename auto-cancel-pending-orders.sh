#!/bin/bash

# ============================================
# Auto-Cancel Pending Orders Cron Script
# ============================================
# This script calls the Next.js API endpoint to auto-cancel pending orders
# that are older than 24 hours
# ============================================

# ========== CONFIGURATION - EDIT THESE ==========
DOMAIN="http://localhost:3000"  # GANTI dengan domain server (contoh: https://meoris.com)
CRON_SECRET="your-secret-key-here"  # GANTI dengan CRON_SECRET dari .env
LOG_FILE="$HOME/cron-scripts/logs/auto-cancel.log"  # Path untuk log file
# ================================================

# Create log directory if not exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Start
log "========================================="
log "Starting auto-cancel pending orders cron job"
log "Domain: $DOMAIN"

# Call API endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${DOMAIN}/api/cron/auto-cancel-pending-orders" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  --max-time 30)

# Check if curl command succeeded
if [ $? -ne 0 ]; then
    log "❌ Curl command failed - connection error"
    log "========================================="
    exit 1
fi

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

# Extract response body (all lines except last)
BODY=$(echo "$RESPONSE" | sed '$d')

# Log response
log "HTTP Status: $HTTP_CODE"
log "Response: $BODY"

# Check if successful
if [ "$HTTP_CODE" -eq 200 ]; then
    # Parse ordersCancelled from JSON response (basic parsing)
    ORDERS_CANCELLED=$(echo "$BODY" | grep -o '"ordersCancelled":[0-9]*' | grep -o '[0-9]*')

    if [ -n "$ORDERS_CANCELLED" ] && [ "$ORDERS_CANCELLED" -gt 0 ]; then
        log "✅ Cron job completed successfully - $ORDERS_CANCELLED order(s) cancelled"
    else
        log "✅ Cron job completed successfully - No orders to cancel"
    fi
elif [ "$HTTP_CODE" -eq 401 ]; then
    log "❌ Authentication failed - check CRON_SECRET"
else
    log "❌ Cron job failed with HTTP $HTTP_CODE"
fi

log "========================================="

# Exit with appropriate code
if [ "$HTTP_CODE" -eq 200 ]; then
    exit 0
else
    exit 1
fi
