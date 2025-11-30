-- Add missing columns to newsletter_subscriptions table

-- Add is_active column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'newsletter_subscriptions' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE newsletter_subscriptions ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add subscribed_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'newsletter_subscriptions' AND column_name = 'subscribed_at'
    ) THEN
        ALTER TABLE newsletter_subscriptions ADD COLUMN subscribed_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add unsubscribed_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'newsletter_subscriptions' AND column_name = 'unsubscribed_at'
    ) THEN
        ALTER TABLE newsletter_subscriptions ADD COLUMN unsubscribed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add updated_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'newsletter_subscriptions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE newsletter_subscriptions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_newsletter_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_newsletter_subscriptions_updated_at ON newsletter_subscriptions;

CREATE TRIGGER trigger_update_newsletter_subscriptions_updated_at
  BEFORE UPDATE ON newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_subscriptions_updated_at();

-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_is_active ON newsletter_subscriptions(is_active);
