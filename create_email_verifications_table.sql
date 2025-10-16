-- =============================================
-- TABLE: email_verifications (Supabase / Postgres)
-- Purpose: Store short‑lived verification codes with server‑side state
-- Flows supported: signup (default), login, reset_password, change_email
-- =============================================

-- Prereqs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'signup' CHECK (purpose IN ('signup','login','reset_password','change_email')),
  code_hash TEXT NOT NULL, -- store SHA-256 (hex/base64) of the code (with optional pepper/salt)
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip INET, -- optional audit
  user_agent TEXT, -- optional audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_email_verif_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verif_expires ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verif_used ON email_verifications(used_at);
-- Speed up lookups for active tokens per email/purpose
-- NOTE: Partial index predicates must be IMMUTABLE; NOW() is STABLE and not allowed.
-- Include expires_at in the index key and keep predicate simple (used_at IS NULL).
-- Queries should still add `expires_at > NOW()` and the planner can use this index.
CREATE INDEX IF NOT EXISTS idx_email_verif_active
  ON email_verifications(email, purpose, expires_at)
  WHERE used_at IS NULL;

-- Updated_at trigger (reuse helper if present)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_verif_updated_at ON email_verifications;
CREATE TRIGGER update_email_verif_updated_at
  BEFORE UPDATE ON email_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS
-- =============================================
-- For simplicity, disable RLS so server (using anon key) can manage records
-- strictly via your Next.js API routes. If you prefer RLS, see template below.
ALTER TABLE email_verifications DISABLE ROW LEVEL SECURITY;

-- RLS TEMPLATE (enable if using service role or tailored policies)
-- ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
-- -- Example: allow inserts/selects/updates from anon role only via PostgREST
-- -- Caution: expose only necessary columns if enabling direct client access.
-- CREATE POLICY "ev_insert" ON email_verifications
--   FOR INSERT TO anon
--   WITH CHECK (true);
-- CREATE POLICY "ev_select_own_active" ON email_verifications
--   FOR SELECT TO anon
--   USING (
--     used_at IS NULL
--     AND NOW() < expires_at
--   );
-- CREATE POLICY "ev_update_attempts" ON email_verifications
--   FOR UPDATE TO anon
--   USING (used_at IS NULL AND NOW() < expires_at)
--   WITH CHECK (used_at IS NULL);

-- =============================================
-- NOTES
-- - code_hash should be a hash of (code [+ pepper/salt]) using SHA-256.
-- - On send: create row with code_hash, expires_at (e.g., NOW()+ interval '5 minutes').
-- - On verify: lookup by email+purpose WHERE used_at IS NULL AND expires_at>NOW(),
--   verify constant‑time hash match, increment attempts, enforce max_attempts,
--   then set used_at on success.
-- - Consider periodic cleanup of expired/used rows.
