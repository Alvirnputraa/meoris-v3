const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applySqlFix() {
  console.log('='.repeat(80));
  console.log('🔧 APPLYING SQL FIX TO SUPABASE DATABASE');
  console.log('='.repeat(80));

  // The fixed SQL function
  const fixedFunction = `
CREATE OR REPLACE FUNCTION auto_cancel_pending_orders()
RETURNS TABLE(cancelled_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_count INTEGER := 0;
  v_checkout_record RECORD;
  v_order_record RECORD;
BEGIN
  RAISE NOTICE '[AUTO-CANCEL] Starting auto-cancel job at %', NOW();

  -- Cancel expired checkout_submissions
  FOR v_checkout_record IN
    SELECT
      id,
      user_id,
      payment_reference,
      created_at,
      payment_expired_at,
      status
    FROM checkout_submissions
    WHERE
      status = 'submitted'
      AND payment_expired_at IS NOT NULL
      AND payment_expired_at < NOW()
    ORDER BY payment_expired_at ASC
  LOOP
    BEGIN
      UPDATE checkout_submissions
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_checkout_record.id;

      RAISE NOTICE '[AUTO-CANCEL] Cancelled checkout ID: %, Ref: %, User: %, Expired at: %',
        v_checkout_record.id,
        v_checkout_record.payment_reference,
        v_checkout_record.user_id,
        v_checkout_record.payment_expired_at;

      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        created_at
      ) VALUES (
        v_checkout_record.user_id,
        'Pesanan dibatalkan',
        'Pesanan dengan nomor ' || COALESCE(v_checkout_record.payment_reference, v_checkout_record.id::text) || ' telah dibatalkan karena melewati batas waktu pembayaran.',
        'order_cancelled',
        NOW()
      );

      v_cancelled_count := v_cancelled_count + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[AUTO-CANCEL] Error cancelling checkout %: %', v_checkout_record.id, SQLERRM;
    END;
  END LOOP;

  -- Backward compatibility: Cancel old orders in orders table
  FOR v_order_record IN
    SELECT
      id,
      user_id,
      created_at,
      status
    FROM orders
    WHERE
      status IN ('pending', 'belum bayar')
      AND created_at < NOW() - INTERVAL '24 hours'
      AND created_at IS NOT NULL
    ORDER BY created_at ASC
  LOOP
    BEGIN
      UPDATE orders
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_order_record.id;

      RAISE NOTICE '[AUTO-CANCEL] Cancelled order ID: %, User: %, Created: %, Old Status: %',
        v_order_record.id,
        v_order_record.user_id,
        v_order_record.created_at,
        v_order_record.status;

      INSERT INTO notifications (
        user_id,
        order_id,
        title,
        message,
        type,
        created_at
      ) VALUES (
        v_order_record.user_id,
        v_order_record.id,
        'Pesanan dibatalkan',
        'Pesanan anda telah dibatalkan karena melewati batas waktu pembayaran.',
        'order_cancelled',
        NOW()
      );

      v_cancelled_count := v_cancelled_count + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[AUTO-CANCEL] Error cancelling order %: %', v_order_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[AUTO-CANCEL] Completed. Total cancelled: %', v_cancelled_count;

  RETURN QUERY SELECT v_cancelled_count;
END;
$$;
`;

  console.log('\n⚠️  IMPORTANT: JavaScript client cannot execute DDL (CREATE FUNCTION) directly.');
  console.log('\n📋 YOU NEED TO MANUALLY APPLY THIS FIX:');
  console.log('\n' + '='.repeat(80));
  console.log('OPTION 1: Via Supabase Dashboard (RECOMMENDED)');
  console.log('='.repeat(80));
  console.log('\n1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to: SQL Editor (left sidebar)');
  console.log('4. Click "New query"');
  console.log('5. Copy and paste the SQL below');
  console.log('6. Click "Run" (or press Ctrl/Cmd + Enter)');
  console.log('\n' + '-'.repeat(80));
  console.log('SQL TO COPY:');
  console.log('-'.repeat(80));
  console.log(fixedFunction);
  console.log('-'.repeat(80));

  // Save to file for easy copying
  const sqlFile = 'APPLY_THIS_SQL_FIX.sql';
  fs.writeFileSync(sqlFile, fixedFunction);
  console.log('\n✅ SQL saved to file:', sqlFile);
  console.log('   You can open this file and copy the content to Supabase SQL Editor');

  console.log('\n' + '='.repeat(80));
  console.log('OPTION 2: Direct PostgreSQL Connection (Advanced)');
  console.log('='.repeat(80));
  console.log('\nIf you have PostgreSQL client installed:');
  console.log('\npsql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" -f APPLY_THIS_SQL_FIX.sql');

  console.log('\n' + '='.repeat(80));
  console.log('⏭️  AFTER APPLYING THE FIX:');
  console.log('='.repeat(80));
  console.log('\n1. Wait for next cron run (every 10 minutes)');
  console.log('2. Run: node verify_order_DEV-T444563095289GYBH.js');
  console.log('3. Check logs: tail -f /var/log/meoris-cron.log');
  console.log('\nExpected log after fix: "ordersCancelled": 1 (or more)');
  console.log('='.repeat(80));
}

applySqlFix().catch(console.error);
