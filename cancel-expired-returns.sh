#!/bin/bash

# ============================================
# Cancel Expired Returns Cron Script
# ============================================
# This script calls the Next.js API endpoint to auto-cancel
# return requests that have expired
# ============================================

# ========== CONFIGURATION - EDIT THESE ==========
DOMAIN="http://localhost:3000"  # GANTI dengan domain server (contoh: https://meoris.com)
CRON_SECRET="your-secret-key-here"  # GANTI dengan CRON_SECRET dari .env
LOG_FILE="$HOME/cron-scripts/logs/cancel-returns.log"  # Path untuk log file
# ================================================

# Create log directory if not exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Start
log "========================================="
log "Starting cancel expired returns cron job"
log "Domain: $DOMAIN"

# Call API endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${DOMAIN}/api/cron/cancel-expired-returns" \
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
    # Parse returnsCancelled from JSON response (basic parsing)
    RETURNS_CANCELLED=$(echo "$BODY" | grep -o '"returnsCancelled":[0-9]*' | grep -o '[0-9]*')

    if [ -n "$RETURNS_CANCELLED" ] && [ "$RETURNS_CANCELLED" -gt 0 ]; then
        log "✅ Cron job completed successfully - $RETURNS_CANCELLED return(s) cancelled"
    else
        log "✅ Cron job completed successfully - No returns to cancel"
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
