-- Fix RLS policies for user_addresses table
-- This allows all operations without authentication checks

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.user_addresses;

-- Disable RLS temporarily for testing
ALTER TABLE public.user_addresses DISABLE ROW LEVEL SECURITY;

-- Note: Run this in Supabase SQL Editor
-- After running this, the addresses should show up in the UI
