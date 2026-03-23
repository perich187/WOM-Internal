-- ================================================================
-- WOM Social — Supabase Schema
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- This builds on top of the existing WOM Dashboard schema.
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- SOCIAL ACCOUNTS
-- One row per platform per client (e.g. Sunrise Bakery / Instagram)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_accounts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID REFERENCES clients(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL CHECK (platform IN (
                     'instagram','facebook','tiktok','linkedin',
                     'twitter','pinterest','youtube','google'
                   )),
  username         TEXT,
  account_name     TEXT,
  followers        INTEGER DEFAULT 0,
  -- Tokens stored here — in production use Vault or encrypt at app layer
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  connected        BOOLEAN DEFAULT FALSE,
  platform_user_id TEXT,   -- the platform's own user/page ID
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, platform)
);

-- ────────────────────────────────────────────────────────────────
-- SOCIAL POSTS
-- A post can target multiple platforms at once
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  platforms       TEXT[] NOT NULL DEFAULT '{}',  -- ['instagram','facebook']
  content         TEXT NOT NULL DEFAULT '',
  media_urls      TEXT[] DEFAULT '{}',
  status          TEXT DEFAULT 'draft' CHECK (
                    status IN ('draft','scheduled','published','failed')
                  ),
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- SOCIAL POST ANALYTICS
-- One row per platform per post — populated after publishing
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_post_analytics (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id      UUID REFERENCES social_posts(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL,
  likes        INTEGER DEFAULT 0,
  comments     INTEGER DEFAULT 0,
  shares       INTEGER DEFAULT 0,
  reach        INTEGER DEFAULT 0,
  impressions  INTEGER DEFAULT 0,
  recorded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_social_accounts_updated_at ON social_accounts;
CREATE TRIGGER set_social_accounts_updated_at
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_social_posts_updated_at ON social_posts;
CREATE TRIGGER set_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────
ALTER TABLE social_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_analytics  ENABLE ROW LEVEL SECURITY;

-- Authenticated staff can read and write all social data
CREATE POLICY "Auth read social_accounts"
  ON social_accounts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write social_accounts"
  ON social_accounts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Auth read social_posts"
  ON social_posts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write social_posts"
  ON social_posts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Auth read social_post_analytics"
  ON social_post_analytics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write social_post_analytics"
  ON social_post_analytics FOR ALL USING (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────────
-- STORAGE BUCKET for social media uploads
-- ────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('social-media', 'social-media', true)
  ON CONFLICT DO NOTHING;

CREATE POLICY "Public read social-media"
  ON storage.objects FOR SELECT USING (bucket_id = 'social-media');
CREATE POLICY "Auth upload social-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'social-media' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update social-media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'social-media' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete social-media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'social-media' AND auth.role() = 'authenticated');

-- ================================================================
-- Done! Next steps:
--   1. This schema is already applied via the SQL Editor
--   2. The app will use the same credentials as WOM Dashboard
-- ================================================================
