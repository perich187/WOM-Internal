-- Migration 009: Extra campaign_influencer tracking fields
-- Run this in the Supabase SQL editor AFTER migration 008.
--
-- Adds fields to match the existing WOM influencer outreach spreadsheet:
--   • offer         — what package/product is being offered (e.g. "LE BAR", "HIGH TEA")
--   • contact_note  — freeform follow-up state ("Messaged", "Emailed", "No reply yet", "SEEN")
--   • posted_date   — date the influencer actually posted
--   • content_type  — reel / story / post / multiple (optional tagging)

ALTER TABLE campaign_influencers
  ADD COLUMN IF NOT EXISTS offer         TEXT,
  ADD COLUMN IF NOT EXISTS contact_note  TEXT,
  ADD COLUMN IF NOT EXISTS posted_date   DATE,
  ADD COLUMN IF NOT EXISTS content_type  TEXT;
