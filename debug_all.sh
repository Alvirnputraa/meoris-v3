#!/bin/bash
# =====================================================
# ALL-IN-ONE DEBUG SCRIPT
# =====================================================
# Jalankan: bash debug_all.sh
# =====================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${BLUE}=========================================="
echo "AUTO-CANCEL DEBUG - ALL CHECKS"
echo -e "==========================================${NC}"
echo ""

# 1. CRON LOGS
echo -e "${GREEN}1. CRON LOGS (Last 20 lines):${NC}"
echo "------------------------------------------"
if [ -f /var/log/meoris-cron.log ]; then
    tail -n 20 /var/log/meoris-cron.log
    if [ $(wc -l < /var/log/meoris-cron.log) -eq 0 ]; then
        echo -e "${RED}⚠️  Log file is EMPTY - cron might not be running!${NC}"
    fi
else
    echo -e "${RED}❌ Log file not found: /var/log/meoris-cron.log${NC}"
fi
echo ""

# 2. CRON SERVICE
echo -e "${GREEN}2. CRON SERVICE STATUS:${NC}"
echo "------------------------------------------"
if systemctl is-active --quiet cron; then
    echo -e "${GREEN}✅ Cron service is RUNNING${NC}"
else
    echo -e "${RED}❌ Cron service is NOT RUNNING${NC}"
    echo "   Fix: sudo systemctl start cron"
fi
echo ""

# 3. SERVER PORT 3005
echo -e "${GREEN}3. SERVER RUNNING ON PORT 3005:${NC}"
echo "------------------------------------------"
port_check=$(netstat -tulpn 2>/dev/null | grep :3005)
if [ -n "$port_check" ]; then
    echo -e "${GREEN}✅ Server is RUNNING on port 3005${NC}"
    echo "$port_check"
else
    echo -e "${RED}❌ Server is NOT RUNNING on port 3005${NC}"
    echo "   Fix: cd /path/to/project && npm run start"
    echo "   Or check: ps aux | grep node"
fi
echo ""

# 4. CRONTAB CHECK
echo -e "${GREEN}4. CRONTAB CONFIGURATION:${NC}"
echo "------------------------------------------"
cron_entry=$(crontab -l 2>/dev/null | grep auto-cancel)
if [ -n "$cron_entry" ]; then
    echo -e "${GREEN}✅ Cron job configured:${NC}"
    echo "   $cron_entry"
else
    echo -e "${RED}❌ No auto-cancel cron job found${NC}"
    echo "   Fix: crontab -e"
fi
echo ""

# 5. API ENDPOINT TEST
echo -e "${GREEN}5. API ENDPOINT TEST:${NC}"
echo "------------------------------------------"
echo "Testing: http://localhost:3005/api/cron/auto-cancel-pending-orders"

response=$(curl -s -w "\n%{http_code}" http://localhost:3005/api/cron/auto-cancel-pending-orders 2>&1)
http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ HTTP 200 OK${NC}"
    echo "Response: $body"
elif [ "$http_code" = "401" ]; then
    echo -e "${YELLOW}⚠️  HTTP 401 Unauthorized${NC}"
    echo "Response: $body"
    echo "Note: This is normal - endpoint requires CRON_SECRET"
    echo "But it means server IS RUNNING!"
elif [[ "$response" =~ "Connection refused" ]] || [[ "$response" =~ "Failed to connect" ]]; then
    echo -e "${RED}❌ Connection REFUSED${NC}"
    echo "Server is NOT running on port 3005"
    echo "Check: ps aux | grep node"
else
    echo -e "${RED}❌ HTTP $http_code${NC}"
    echo "Response: $body"
fi
echo ""

# 6. SYSLOG CRON EXECUTION
echo -e "${GREEN}6. RECENT CRON EXECUTIONS (from syslog):${NC}"
echo "------------------------------------------"
if [ -f /var/log/syslog ]; then
    recent_cron=$(grep CRON /var/log/syslog | grep "$(whoami)" | grep "auto-cancel" | tail -n 3)
    if [ -n "$recent_cron" ]; then
        echo "$recent_cron"
    else
        echo "No auto-cancel executions found in syslog"
        echo "Last 3 CRON executions:"
        grep CRON /var/log/syslog | grep "$(whoami)" | tail -n 3
    fi
else
    echo "Syslog not available"
fi
echo ""

# SUMMARY
echo -e "${BLUE}=========================================="
echo "SUMMARY & RECOMMENDATIONS"
echo -e "==========================================${NC}"

# Check what's wrong
issues=0

if ! systemctl is-active --quiet cron; then
    echo -e "${RED}• Cron service is not running → Start it: sudo systemctl start cron${NC}"
    ((issues++))
fi

if ! netstat -tulpn 2>/dev/null | grep -q :3005; then
    echo -e "${RED}• Server is not running on port 3005 → Start your Next.js server${NC}"
    ((issues++))
fi

if ! crontab -l 2>/dev/null | grep -q auto-cancel; then
    echo -e "${RED}• Cron job not configured → Add to crontab: crontab -e${NC}"
    ((issues++))
fi

if [ -f /var/log/meoris-cron.log ] && [ $(wc -l < /var/log/meoris-cron.log) -eq 0 ]; then
    echo -e "${YELLOW}• Log file is empty → Cron might not have run yet, or there's an issue${NC}"
    ((issues++))
fi

if [ $issues -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! System looks healthy.${NC}"
    echo ""
    echo "If auto-cancel still not working, check:"
    echo "• Database: Is SQL function 'auto_cancel_pending_orders' created?"
    echo "• Run: curl http://localhost:3005/api/cron/auto-cancel-pending-orders"
else
    echo ""
    echo -e "${RED}Found $issues issue(s) - fix them above ⬆️${NC}"
fi

echo ""
echo -e "${BLUE}==========================================${NC}"
