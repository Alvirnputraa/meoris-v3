// Test script untuk debug ongkir query
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vtwooclhjobgdgvljauq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0d29vY2xoam9iZ2RndmxqYXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MjQzNTIsImV4cCI6MjA3NDAwMDM1Mn0.4cnd_WQ26viMhHyyI7thasFmb503xVgvlQ3oeIrUDRs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOngkirQueries() {
  console.log('=== Testing Ongkir Queries ===\n');

  // 1. Get all ongkir data
  console.log('1. All ongkir data:');
  const { data: allData, error: allError } = await supabase
    .from('ongkir')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (allError) {
    console.error('Error:', allError);
  } else {
    console.log('Data:', JSON.stringify(allData, null, 2));
  }

  console.log('\n---\n');

  // 2. Test query for J&T
  console.log('2. Query for J&T (using ilike):');
  const { data: jntData, error: jntError } = await supabase
    .from('ongkir')
    .select('*')
    .ilike('ekspedisi', 'J&T')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (jntError) {
    console.error('Error:', jntError);
  } else {
    console.log('Data:', JSON.stringify(jntData, null, 2));
  }

  console.log('\n---\n');

  // 3. Test query for JNE
  console.log('3. Query for JNE (using ilike):');
  const { data: jneData, error: jneError } = await supabase
    .from('ongkir')
    .select('*')
    .ilike('ekspedisi', 'JNE')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (jneError) {
    console.error('Error:', jneError);
  } else {
    console.log('Data:', JSON.stringify(jneData, null, 2));
  }

  console.log('\n---\n');

  // 4. Test with exact match (eq)
  console.log('4. Test with eq for J&T:');
  const { data: jntEqData, error: jntEqError } = await supabase
    .from('ongkir')
    .select('*')
    .eq('ekspedisi', 'J&T')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (jntEqError) {
    console.error('Error:', jntEqError);
  } else {
    console.log('Data:', JSON.stringify(jntEqData, null, 2));
  }
}

testOngkirQueries().then(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
