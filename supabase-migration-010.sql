-- Migration 010: Influencer search history
-- Run this in the Supabase SQL editor AFTER migration 009.

CREATE TABLE IF NOT EXISTS influencer_search_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     TEXT NOT NULL,            -- instagram | facebook | tiktok
  query        TEXT NOT NULL,            -- search term as entered
  result_count INT  NOT NULL DEFAULT 0,
  from_cache   BOOLEAN NOT NULL DEFAULT FALSE,
  searched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS search_history_platform_idx  ON influencer_search_history (platform);
CREATE INDEX IF NOT EXISTS search_history_searched_idx  ON influencer_search_history (searched_at DESC);

ALTER TABLE influencer_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage search history" ON influencer_search_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
