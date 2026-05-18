-- AI Analytics Migration for GuidanceSync
-- Run in Supabase SQL Editor AFTER schema.sql and ai_tables.sql

-- ── Add analytics columns to assessments ─────────────────────────────────────
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS main_concerns   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS emotional_state TEXT;

-- ── Add latest_stress_level and last_assessment_at to profiles ────────────────
-- These allow fast lookups for the student directory analytics
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS latest_stress_level  INTEGER,
  ADD COLUMN IF NOT EXISTS last_assessment_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wellness_score       INTEGER;
