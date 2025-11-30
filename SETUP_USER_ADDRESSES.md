# Setup User Addresses Table

The API is returning a 500 error because the `user_addresses` table doesn't exist yet in your Supabase database.

## Steps to Fix

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor** (in the left sidebar)

2. **Run the Migration**
   - Click "New query"
   - Copy the entire contents of `create_user_addresses_table.sql`
   - Paste it into the SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Verify the Table**
   - Go to **Table Editor** in Supabase
   - You should see a new table called `user_addresses`
   - It should have columns: id, user_id, nama, phone, street, provinsi, kabupaten, kecamatan, kelurahan, postal, is_default, created_at, updated_at

4. **Test the Address View**
   - Refresh your app at http://localhost:3000/user/purchase?view=address
   - The 500 error should be gone
   - You should be able to add new addresses

## What This Migration Does

- Creates the `user_addresses` table with all necessary columns
- Adds indexes for performance
- Creates a trigger to ensure only one default address per user
- Sets up Row Level Security (RLS) policies
- Adds automatic timestamp updating

## File Location

The SQL file is located at:
`create_user_addresses_table.sql`
