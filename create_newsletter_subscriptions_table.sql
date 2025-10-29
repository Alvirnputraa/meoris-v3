-- Create table for newsletter subscriptions
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);

-- Enable RLS (Row Level Security)
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert their email
CREATE POLICY "Anyone can insert their email" ON newsletter_subscriptions
  FOR INSERT WITH CHECK (true);

-- Create policy to allow anyone to view their own subscription
CREATE POLICY "Anyone can view their own subscription" ON newsletter_subscriptions
  FOR SELECT USING (true);

-- Create policy to allow anyone to update their own subscription
CREATE POLICY "Anyone can update their own subscription" ON newsletter_subscriptions
  FOR UPDATE USING (true);

-- Create policy to prevent deletion (optional, remove if you want to allow deletion)
CREATE POLICY "No one can delete subscriptions" ON newsletter_subscriptions
  FOR DELETE USING (false);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_newsletter_subscriptions_updated_at
  BEFORE UPDATE ON newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();