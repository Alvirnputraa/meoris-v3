// Setup ongkir fallback data via Node.js
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupOngkirData() {
  console.log('\n🚀 Setting up ongkir fallback data...\n')

  const fallbackRates = [
    {
      ekspedisi: 'J&T Express',
      ongkir: 14000
    },
    {
      ekspedisi: 'JNE',
      ongkir: 15000
    },
    {
      ekspedisi: 'SiCepat',
      ongkir: 13000
    }
  ]

  try {
    // First, clear existing data
    await supabase.from('ongkir').delete().neq('id', 0)

    // Insert fresh data
    const { data, error } = await supabase
      .from('ongkir')
      .insert(fallbackRates)
      .select()

    if (error) {
      console.error('❌ Error inserting data:', error.message)
    } else {
      console.log('✅ Successfully inserted:')
      data.forEach(rate => {
        console.log(`   - ${rate.ekspedisi}: Rp ${rate.ongkir.toLocaleString('id-ID')}`)
      })
    }

    // Verify
    console.log('\n📋 Final ongkir table data:\n')
    const { data: allData, error: selectError } = await supabase
      .from('ongkir')
      .select('*')
      .order('ekspedisi')

    if (selectError) {
      console.error('❌ Error reading data:', selectError.message)
    } else {
      console.table(allData)
      console.log('\n✅ Ongkir fallback data setup complete!')
    }

  } catch (err) {
    console.error('❌ Exception:', err.message)
  }
}

setupOngkirData()
