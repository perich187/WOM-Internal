-- ================================================================
-- WOM Social — Standalone Schema
-- Paste this entire file into Supabase SQL Editor and click Run
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. PROFILES  (extends Supabase auth.users)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  email      TEXT,
  role       TEXT DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────────
-- 2. CLIENTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  industry    TEXT,
  website     TEXT,
  notes       TEXT,
  color       TEXT DEFAULT '#F0A629',
  status      TEXT DEFAULT 'Active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────────
-- 3. SOCIAL ACCOUNTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID REFERENCES clients(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL,
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
-- 4. SOCIAL POSTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  platforms       TEXT[] NOT NULL DEFAULT '{}',
  content         TEXT NOT NULL DEFAULT '',
  media_urls      TEXT[] DEFAULT '{}',
  status          TEXT DEFAULT 'draft',
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────────
-- 5. SOCIAL POST ANALYTICS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_post_analytics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- 6. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_profiles_select"    ON profiles              FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_profiles_all"       ON profiles              FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "auth_clients_select"     ON clients               FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_clients_all"        ON clients               FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "auth_accounts_select"    ON social_accounts       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_accounts_all"       ON social_accounts       FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "auth_posts_select"       ON social_posts          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_posts_all"          ON social_posts          FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "auth_analytics_select"   ON social_post_analytics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_analytics_all"      ON social_post_analytics FOR ALL    USING (auth.role() = 'authenticated');


-- ────────────────────────────────────────────────────────────────
-- 7. STORAGE BUCKET
-- ────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('social-media', 'social-media', true)
  ON CONFLICT DO NOTHING;

CREATE POLICY "storage_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'social-media');
CREATE POLICY "storage_auth_insert"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'social-media' AND auth.role() = 'authenticated');
CREATE POLICY "storage_auth_update"  ON storage.objects FOR UPDATE USING (bucket_id = 'social-media' AND auth.role() = 'authenticated');
CREATE POLICY "storage_auth_delete"  ON storage.objects FOR DELETE USING (bucket_id = 'social-media' AND auth.role() = 'authenticated');
