#!/bin/bash
# =====================================================
# MEORIS CRON JOB MONITORING SCRIPT
# =====================================================
# Usage: bash monitor_cron.sh
# =====================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear
echo -e "${BLUE}=========================================="
echo "MEORIS AUTO-CANCEL CRON JOB MONITORING"
echo -e "==========================================${NC}"
echo ""
echo "Report generated at: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 1. CRONTAB CONFIGURATION
echo -e "${GREEN}1. CRONTAB CONFIGURATION:${NC}"
echo "------------------------------------------"
if crontab -l 2>/dev/null | grep -q "auto-cancel"; then
    crontab -l | grep "auto-cancel" | sed 's/^/   /'
    echo -e "   ${GREEN}✅ Cron job configured${NC}"
else
    echo -e "   ${RED}❌ No auto-cancel cron job found${NC}"
fi
echo ""

# 2. CRON SERVICE STATUS
echo -e "${GREEN}2. CRON SERVICE STATUS:${NC}"
echo "------------------------------------------"
if systemctl is-active --quiet cron; then
    echo -e "   ${GREEN}✅ Cron service is running${NC}"
else
    echo -e "   ${RED}❌ Cron service is NOT running${NC}"
    echo "   Run: sudo systemctl start cron"
fi
echo ""

# 3. LOG FILE CHECK
echo -e "${GREEN}3. LOG FILE STATUS:${NC}"
echo "------------------------------------------"
if [ -f /var/log/meoris-cron.log ]; then
    size=$(du -h /var/log/meoris-cron.log | cut -f1)
    lines=$(wc -l < /var/log/meoris-cron.log)
    echo "   File: /var/log/meoris-cron.log"
    echo "   Size: $size"
    echo "   Lines: $lines"
    echo -e "   ${GREEN}✅ Log file exists${NC}"
else
    echo -e "   ${RED}❌ Log file not found: /var/log/meoris-cron.log${NC}"
    echo "   Run: sudo touch /var/log/meoris-cron.log && sudo chmod 666 /var/log/meoris-cron.log"
fi
echo ""

# 4. EXECUTION COUNT TODAY
echo -e "${GREEN}4. EXECUTIONS TODAY:${NC}"
echo "------------------------------------------"
if [ -f /var/log/meoris-cron.log ]; then
    # Count by searching for success/error responses
    total=$(grep -c "success\|error\|ordersCancelled" /var/log/meoris-cron.log 2>/dev/null || echo 0)
    current_hour=$(date +%H)
    # Expected: 6 executions per hour (every 10 minutes)
    expected=$((current_hour * 6))

    echo "   Total executions: $total"
    echo "   Expected (~every 10 min): ~$expected"

    if [ $total -ge $((expected - 6)) ]; then
        echo -e "   ${GREEN}✅ Execution count looks good${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Lower than expected${NC}"
    fi
else
    echo "   No log file to check"
fi
echo ""

# 5. LAST 5 EXECUTIONS
echo -e "${GREEN}5. LAST 5 EXECUTIONS:${NC}"
echo "------------------------------------------"
if [ -f /var/log/meoris-cron.log ]; then
    # Try to extract last 5 JSON responses or any output
    tail -n 20 /var/log/meoris-cron.log | grep -E "success|ordersCancelled|error" | tail -n 5 | while read line; do
        echo "   $line"
    done

    if [ $(tail -n 20 /var/log/meoris-cron.log | grep -c "success\|error") -eq 0 ]; then
        echo "   (No recent executions found in log)"
        echo ""
        echo "   Last 5 lines from log:"
        tail -n 5 /var/log/meoris-cron.log | sed 's/^/   /'
    fi
else
    echo "   No log file"
fi
echo ""

# 6. ERROR SUMMARY
echo -e "${GREEN}6. ERROR SUMMARY TODAY:${NC}"
echo "------------------------------------------"
if [ -f /var/log/meoris-cron.log ]; then
    error_count=$(grep -ic "error" /var/log/meoris-cron.log 2>/dev/null || echo 0)
    success_count=$(grep -ic "success" /var/log/meoris-cron.log 2>/dev/null || echo 0)

    echo "   Success: $success_count"
    echo "   Errors: $error_count"

    if [ $error_count -eq 0 ]; then
        echo -e "   ${GREEN}✅ No errors found${NC}"
    else
        echo -e "   ${YELLOW}⚠️  $error_count errors detected${NC}"
        echo ""
        echo "   Last error:"
        grep -i "error" /var/log/meoris-cron.log | tail -n 1 | sed 's/^/   /'
    fi
else
    echo "   No log file"
fi
echo ""

# 7. LAST CRON EXECUTION (from syslog)
echo -e "${GREEN}7. LAST CRON EXECUTION (SYSLOG):${NC}"
echo "------------------------------------------"
if [ -f /var/log/syslog ]; then
    last_cron=$(grep CRON /var/log/syslog | grep "$(whoami)" | tail -n 1)
    if [ -n "$last_cron" ]; then
        echo "   $last_cron"
    else
        echo "   No cron execution found in syslog"
    fi
else
    echo "   Syslog not available"
fi
echo ""

# 8. API ENDPOINT STATUS
echo -e "${GREEN}8. API ENDPOINT CHECK:${NC}"
echo "------------------------------------------"
echo "   Testing: http://localhost:3005/api/cron/auto-cancel-pending-orders"

response=$(curl -s -w "\n%{http_code}" -o /tmp/cron_test_response.txt http://localhost:3005/api/cron/auto-cancel-pending-orders 2>&1)
http_code=$(echo "$response" | tail -n 1)
body=$(cat /tmp/cron_test_response.txt 2>/dev/null)

if [ "$http_code" = "200" ]; then
    echo -e "   ${GREEN}✅ HTTP 200 OK${NC}"
    echo "   Response: $body"
elif [ "$http_code" = "401" ]; then
    echo -e "   ${YELLOW}⚠️  HTTP 401 Unauthorized (CRON_SECRET needed)${NC}"
    echo "   This is normal - endpoint requires auth header"
else
    echo -e "   ${RED}❌ HTTP $http_code${NC}"
    echo "   Response: $body"
    echo "   Check if server is running on port 3005"
fi

rm -f /tmp/cron_test_response.txt 2>/dev/null
echo ""

# 9. RECOMMENDATIONS
echo -e "${BLUE}=========================================="
echo "RECOMMENDATIONS:"
echo -e "==========================================${NC}"

if ! systemctl is-active --quiet cron; then
    echo "• Start cron service: sudo systemctl start cron"
fi

if ! crontab -l 2>/dev/null | grep -q "auto-cancel"; then
    echo "• Add cron job: crontab -e"
fi

if [ ! -f /var/log/meoris-cron.log ]; then
    echo "• Create log file: sudo touch /var/log/meoris-cron.log && sudo chmod 666 /var/log/meoris-cron.log"
fi

if [ -f /var/log/meoris-cron.log ]; then
    lines=$(wc -l < /var/log/meoris-cron.log)
    if [ $lines -gt 10000 ]; then
        echo "• Log file getting large ($lines lines) - consider rotating"
    fi
fi

echo ""
echo -e "${BLUE}=========================================="
echo "COMMANDS:"
echo -e "==========================================${NC}"
echo "• View logs live:    tail -f /var/log/meoris-cron.log"
echo "• View syslog:       grep CRON /var/log/syslog | tail -n 20"
echo "• Test API:          curl http://localhost:3005/api/cron/auto-cancel-pending-orders"
echo "• Edit crontab:      crontab -e"
echo "• Check cron status: systemctl status cron"
echo ""
