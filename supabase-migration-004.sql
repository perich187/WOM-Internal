-- Migration 004: Site Audit background jobs
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS site_audit_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  url           TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  urls_to_crawl TEXT[],
  crawled_pages JSONB NOT NULL DEFAULT '[]',
  result        JSONB,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE site_audit_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON site_audit_jobs USING (false);
