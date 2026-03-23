-- Migration 002: Pending Meta OAuth sessions for Page selection UI
-- Run in Supabase SQL editor before deploying this release.

CREATE TABLE IF NOT EXISTS meta_oauth_pending (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE,
  pages      JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meta_oauth_pending ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_pending_all" ON meta_oauth_pending
  FOR ALL USING (auth.role() = 'authenticated');

-- Auto-delete sessions older than 1 hour (keeps the table clean)
CREATE OR REPLACE FUNCTION delete_old_pending_sessions()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM meta_oauth_pending WHERE created_at < NOW() - INTERVAL '1 hour';
$$;
