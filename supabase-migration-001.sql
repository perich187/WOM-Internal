-- Migration 001: Add first_comment column to social_posts
-- Run this in your Supabase SQL editor if your database was created before this migration.

ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS first_comment TEXT;
