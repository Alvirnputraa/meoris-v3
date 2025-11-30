const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPaymentUrl() {
  const { data, error } = await supabase
    .from('checkout_submissions')
    .select('*')
    .eq('id', '410f305d-068b-4639-a3d3-82dbcebfd5a7')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Status:', data.status);
  console.log('Has payment_details:', data.payment_details !== null);
  if (data.payment_details) {
    console.log('Has checkout_url:', data.payment_details.checkout_url !== undefined);
    console.log('checkout_url value:', data.payment_details.checkout_url);
  }
}

checkPaymentUrl();
