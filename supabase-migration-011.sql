-- Migration 011: History tables for Site Speed and Keyword Research
-- Run in Supabase SQL Editor AFTER migration 010.

-- ── SITE SPEED ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_speed_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  url          TEXT NOT NULL,
  strategy     TEXT NOT NULL DEFAULT 'mobile',   -- mobile | desktop
  scores       JSONB NOT NULL DEFAULT '{}',      -- { performance, accessibility, bestPractices, seo }
  vitals       JSONB NOT NULL DEFAULT '[]',      -- array of core web vital objects
  opportunities JSONB NOT NULL DEFAULT '[]',     -- array of improvement opportunities
  fetch_time   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS site_speed_client_idx ON site_speed_results (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS site_speed_url_idx    ON site_speed_results (url, created_at DESC);

ALTER TABLE site_speed_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage site speed results" ON site_speed_results
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── KEYWORD RESEARCH ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS keyword_research_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,                    -- domain | ideas | serp
  query        TEXT NOT NULL,                    -- domain or keyword searched
  location_code INT NOT NULL DEFAULT 2036,
  result_count INT NOT NULL DEFAULT 0,
  source       TEXT,                             -- organic | ads_suggestions (for domain action)
  results      JSONB NOT NULL DEFAULT '[]',      -- full results array
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kw_history_client_idx ON keyword_research_history (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kw_history_query_idx  ON keyword_research_history (query, created_at DESC);

ALTER TABLE keyword_research_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage keyword history" ON keyword_research_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── SITE AUDIT JOBS — allow authenticated reads ───────────────────────────────
-- The original migration 004 set USING(false) which blocks the history panel.
-- Drop that policy and add one that lets authenticated users read audit history.

DROP POLICY IF EXISTS "Service role only" ON site_audit_jobs;
CREATE POLICY "Auth users read site audit jobs" ON site_audit_jobs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role write site audit jobs" ON site_audit_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
