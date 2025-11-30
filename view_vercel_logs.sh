#!/bin/bash
# =====================================================
# VIEW VERCEL LOGS - LINUX/MAC
# =====================================================
# Install Vercel CLI first: npm install -g vercel
# =====================================================

echo ""
echo "========================================"
echo "VERCEL LOGS - AUTO CANCEL CRON JOB"
echo "========================================"
echo ""

# Login to Vercel (if not logged in)
echo "Step 1: Login to Vercel..."
vercel login

echo ""
echo "Step 2: Viewing logs for auto-cancel-pending-orders..."
echo ""

# View logs for the cron function
vercel logs --follow

echo ""
echo "========================================"
echo "Press Ctrl+C to stop viewing logs"
echo "========================================"
echo ""
