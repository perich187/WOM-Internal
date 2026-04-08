-- Migration 008: Influencer database + campaigns
-- Run this in the Supabase SQL editor

-- ── INFLUENCERS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS influencers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  display_name        TEXT,                        -- "Perth Food Adventures"
  first_name          TEXT,                        -- "Ryan"
  email               TEXT,
  location            TEXT,                        -- "Perth, WA"
  niche               TEXT,                        -- "Food", "Lifestyle", "Travel"
  notes               TEXT,

  -- Handles
  instagram_handle    TEXT,
  tiktok_handle       TEXT,
  facebook_handle     TEXT,

  -- Instagram stats
  ig_followers        INT,
  ig_avg_views        INT,
  ig_avg_likes        INT,
  ig_profile_url      TEXT,
  ig_profile_pic      TEXT,

  -- TikTok stats
  tt_followers        INT,
  tt_avg_views        INT,
  tt_avg_likes        INT,
  tt_profile_url      TEXT,
  tt_profile_pic      TEXT,

  -- Facebook stats
  fb_followers        INT,
  fb_page_url         TEXT,
  fb_profile_pic      TEXT,

  -- Scoring / status
  score               NUMERIC(6, 3),               -- internal score
  tags                TEXT[] DEFAULT '{}',         -- ["perth", "food", "cafe"]
  used_recently       BOOLEAN DEFAULT FALSE,
  source              TEXT DEFAULT 'manual',       -- manual | csv | apify
  discovery_query     TEXT,                        -- hashtag/search that surfaced them

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique per platform handle (case-insensitive) so discovery upserts dedupe cleanly
CREATE UNIQUE INDEX IF NOT EXISTS influencers_ig_handle_uq
  ON influencers (LOWER(instagram_handle))
  WHERE instagram_handle IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS influencers_tt_handle_uq
  ON influencers (LOWER(tiktok_handle))
  WHERE tiktok_handle IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS influencers_fb_handle_uq
  ON influencers (LOWER(facebook_handle))
  WHERE facebook_handle IS NOT NULL;

CREATE INDEX IF NOT EXISTS influencers_score_idx      ON influencers (score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS influencers_updated_at_idx ON influencers (updated_at DESC);
CREATE INDEX IF NOT EXISTS influencers_tags_idx       ON influencers USING GIN (tags);

-- ── INFLUENCER CAMPAIGNS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS influencer_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  brief         TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',    -- draft | active | paused | completed
  start_date    DATE,
  end_date      DATE,
  budget        NUMERIC(12, 2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaigns_client_idx ON influencer_campaigns (client_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON influencer_campaigns (status);

-- ── CAMPAIGN ↔ INFLUENCER JOIN ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_influencers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID NOT NULL REFERENCES influencer_campaigns(id) ON DELETE CASCADE,
  influencer_id  UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'shortlisted',
                 -- shortlisted | invited | accepted | declined | posted | paid
  fee            NUMERIC(10, 2),
  deliverables   TEXT,
  post_url       TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, influencer_id)
);

CREATE INDEX IF NOT EXISTS ci_campaign_idx   ON campaign_influencers (campaign_id);
CREATE INDEX IF NOT EXISTS ci_influencer_idx ON campaign_influencers (influencer_id);

-- ── DISCOVERY CACHE (avoid burning Apify credit) ─────────────────────────────

CREATE TABLE IF NOT EXISTS influencer_discovery_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform    TEXT NOT NULL,            -- instagram | facebook | tiktok
  query       TEXT NOT NULL,            -- hashtag or search term (lowercased)
  results     JSONB NOT NULL,           -- raw creator list from Apify
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, query)
);

CREATE INDEX IF NOT EXISTS discovery_cache_created_idx
  ON influencer_discovery_cache (created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE influencers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_influencers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_discovery_cache  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage influencers" ON influencers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users manage influencer campaigns" ON influencer_campaigns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users manage campaign influencers" ON campaign_influencers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users read discovery cache" ON influencer_discovery_cache
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
