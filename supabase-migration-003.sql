  -- Migration 003: Google Search Console connections per client
  -- Run this in your Supabase SQL editor

  CREATE TABLE IF NOT EXISTS digital_gsc_connections (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    google_email  TEXT,
    access_token  TEXT NOT NULL,
    refresh_token TEXT,
    expires_at    TIMESTAMPTZ,
    sites         TEXT[],          -- array of verified Search Console site URLs
    updated_at    TIMESTAMPTZ DEFAULT now(),
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id)
  );

  -- RLS: only service role can read/write (all access via API functions)
  ALTER TABLE digital_gsc_connections ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Service role only"
    ON digital_gsc_connections
    USING (false);
