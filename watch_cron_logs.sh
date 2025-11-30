#!/bin/bash
# =====================================================
# WATCH CRON LOGS REAL-TIME
# =====================================================
# Usage: bash watch_cron_logs.sh
# =====================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

LOG_FILE="/var/log/meoris-cron.log"

clear
echo -e "${BLUE}=========================================="
echo "WATCHING CRON LOGS (Real-time)"
echo -e "==========================================${NC}"
echo "Log file: $LOG_FILE"
echo "Press Ctrl+C to stop"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Check if log file exists
if [ ! -f "$LOG_FILE" ]; then
    echo -e "${RED}Error: Log file not found: $LOG_FILE${NC}"
    echo ""
    echo "Creating log file..."
    sudo touch "$LOG_FILE"
    sudo chmod 666 "$LOG_FILE"
    echo -e "${GREEN}Log file created!${NC}"
    echo ""
fi

# Show last 10 lines first
echo -e "${CYAN}=== LAST 10 LINES ===${NC}"
tail -n 10 "$LOG_FILE"
echo ""
echo -e "${CYAN}=== WATCHING NEW LOGS ===${NC}"
echo ""

# Watch logs with colored output
tail -f "$LOG_FILE" | while read line; do
    # Add timestamp if line doesn't have one
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Color based on content
    if echo "$line" | grep -qi "error"; then
        echo -e "${RED}[$timestamp] $line${NC}"
    elif echo "$line" | grep -qi "success"; then
        echo -e "${GREEN}[$timestamp] $line${NC}"
    elif echo "$line" | grep -qi "ordersCancelled"; then
        echo -e "${YELLOW}[$timestamp] $line${NC}"
    elif echo "$line" | grep -qi "==="; then
        echo -e "${CYAN}$line${NC}"
    else
        echo "[$timestamp] $line"
    fi
done
