const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPendingCheckouts() {
  // Check checkout_submissions yang belum paid
  const { data: checkouts, error } = await supabase
    .from('checkout_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total checkout submissions: ${checkouts.length}\n`);
  
  checkouts.forEach(checkout => {
    console.log('---');
    console.log('ID:', checkout.id);
    console.log('Status:', checkout.status);
    console.log('User ID:', checkout.user_id);
    console.log('Payment Ref:', checkout.payment_reference);
    console.log('Created:', new Date(checkout.created_at).toLocaleString('id-ID'));
  });
}

checkPendingCheckouts();
