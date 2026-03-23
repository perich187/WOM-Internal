-- ================================================================
-- WOM Social — Full Standalone Schema
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- This is self-contained — no dependency on the WOM Dashboard.
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────────
-- PROFILES
-- Auto-created for each Supabase Auth user on sign-up
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  email      TEXT,
  role       TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────────
-- CLIENTS
-- Agency clients whose social media we manage
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name  TEXT NOT NULL,
  industry     TEXT,
  website      TEXT,
  notes        TEXT,
  status       TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Churned')),
  color        TEXT DEFAULT '#F0A629',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

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
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  connected        BOOLEAN DEFAULT FALSE,
  platform_user_id TEXT,
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
  platforms       TEXT[] NOT NULL DEFAULT '{}',
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
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID REFERENCES social_posts(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL,
  likes       INTEGER DEFAULT 0,
  comments    INTEGER DEFAULT 0,
  shares      INTEGER DEFAULT 0,
  reach       INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
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

DROP TRIGGER IF EXISTS set_clients_updated_at ON clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_analytics ENABLE ROW LEVEL SECURITY;

-- Authenticated staff can read and write everything
CREATE POLICY "Auth read profiles"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write profiles"
  ON profiles FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Auth read clients"
  ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write clients"
  ON clients FOR ALL USING (auth.role() = 'authenticated');

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
-- STORAGE BUCKET for social media image/video uploads
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
--   1. Go to Authentication → Users → Add user to create your login
--   2. Start adding clients from the app
-- ================================================================
