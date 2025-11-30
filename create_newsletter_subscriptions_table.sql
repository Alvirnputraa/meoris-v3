-- Create newsletter_subscriptions table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_is_active ON newsletter_subscriptions(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public inserts (for newsletter signup)
CREATE POLICY "Allow public newsletter subscription"
  ON newsletter_subscriptions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy to allow reading active subscriptions (for checking duplicates)
CREATE POLICY "Allow reading newsletter subscriptions"
  ON newsletter_subscriptions
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow updating subscriptions (for reactivation)
CREATE POLICY "Allow updating newsletter subscriptions"
  ON newsletter_subscriptions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_newsletter_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_newsletter_subscriptions_updated_at
  BEFORE UPDATE ON newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_subscriptions_updated_at();

-- Add comment to table
COMMENT ON TABLE newsletter_subscriptions IS 'Stores newsletter subscription emails from the popup';
