#!/bin/bash
# =============================================
# Test Script: Approve Return & Generate JNT Resi
# =============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
ENDPOINT="/api/returns/approve"

# Display usage
usage() {
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./test_approve_return.sh <return_id>"
    echo ""
    echo -e "${YELLOW}Example:${NC}"
    echo "  ./test_approve_return.sh 12345678-1234-1234-1234-123456789abc"
    echo ""
    echo -e "${YELLOW}Environment Variables:${NC}"
    echo "  API_URL - Base URL (default: http://localhost:3000)"
    echo ""
    echo -e "${YELLOW}Example with custom URL:${NC}"
    echo "  API_URL=https://sandal-market-1.preview.emergentagent.com ./test_approve_return.sh <return_id>"
    exit 1
}

# Check if return_id is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: return_id is required${NC}"
    usage
fi

RETURN_ID="$1"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}🚀 Testing Return Approval API${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "API URL: ${GREEN}${API_URL}${ENDPOINT}${NC}"
echo -e "Return ID: ${GREEN}${RETURN_ID}${NC}"
echo ""

# Make API request
echo -e "${YELLOW}📤 Sending request...${NC}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"return_id\": \"${RETURN_ID}\"}")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# Extract response body (all lines except last)
BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "${YELLOW}📥 Response:${NC}"
echo ""

# Pretty print JSON
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

echo ""
echo -e "${YELLOW}========================================${NC}"

# Check HTTP status code
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Success! Return approved and resi generated.${NC}"
    
    # Extract waybill from response
    WAYBILL=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('waybill', 'N/A'))" 2>/dev/null)
    
    if [ "$WAYBILL" != "N/A" ] && [ -n "$WAYBILL" ]; then
        echo ""
        echo -e "${GREEN}📦 JNT Waybill: ${WAYBILL}${NC}"
    fi
else
    echo -e "${RED}❌ Failed with status code: ${HTTP_CODE}${NC}"
fi

echo -e "${YELLOW}========================================${NC}"
