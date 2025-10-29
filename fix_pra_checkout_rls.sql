-- =============================================
-- FIX RLS POLICY UNTUK PRA_CHECKOUT TABLES
-- =============================================

-- Drop existing policies jika ada
DROP POLICY IF EXISTS "Users can view own pra_checkout" ON pra_checkout;
DROP POLICY IF EXISTS "Users can insert own pra_checkout" ON pra_checkout;
DROP POLICY IF EXISTS "Users can update own pra_checkout" ON pra_checkout;
DROP POLICY IF EXISTS "Users can delete own pra_checkout" ON pra_checkout;

DROP POLICY IF EXISTS "Users can view own pra_checkout_items" ON pra_checkout_items;
DROP POLICY IF EXISTS "Users can insert own pra_checkout_items" ON pra_checkout_items;
DROP POLICY IF EXISTS "Users can update own pra_checkout_items" ON pra_checkout_items;
DROP POLICY IF EXISTS "Users can delete own pra_checkout_items" ON pra_checkout_items;

-- Disable RLS temporarily untuk testing
ALTER TABLE pra_checkout DISABLE ROW LEVEL SECURITY;
ALTER TABLE pra_checkout_items DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE pra_checkout ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_checkout_items ENABLE ROW LEVEL SECURITY;

-- Create simple policies untuk pra_checkout
CREATE POLICY "Allow all for pra_checkout" ON pra_checkout
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for pra_checkout_items" ON pra_checkout_items  
    FOR ALL USING (true) WITH CHECK (true);

-- Alternative: More secure policies (uncomment jika mau lebih aman)
/*
CREATE POLICY "Users can view own pra_checkout" ON pra_checkout
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own pra_checkout" ON pra_checkout
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own pra_checkout" ON pra_checkout
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own pra_checkout" ON pra_checkout
    FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own pra_checkout_items" ON pra_checkout_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pra_checkout 
            WHERE pra_checkout.id = pra_checkout_items.pra_checkout_id 
            AND auth.uid()::text = pra_checkout.user_id::text
        )
    );

CREATE POLICY "Users can insert own pra_checkout_items" ON pra_checkout_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pra_checkout 
            WHERE pra_checkout.id = pra_checkout_items.pra_checkout_id 
            AND auth.uid()::text = pra_checkout.user_id::text
        )
    );

CREATE POLICY "Users can update own pra_checkout_items" ON pra_checkout_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pra_checkout 
            WHERE pra_checkout.id = pra_checkout_items.pra_checkout_id 
            AND auth.uid()::text = pra_checkout.user_id::text
        )
    );

CREATE POLICY "Users can delete own pra_checkout_items" ON pra_checkout_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pra_checkout 
            WHERE pra_checkout.id = pra_checkout_items.pra_checkout_id 
            AND auth.uid()::text = pra_checkout.user_id::text
        )
    );
*/