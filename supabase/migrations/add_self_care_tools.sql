-- Migration: Add self_care_tools column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS self_care_tools JSONB DEFAULT '[]'::jsonb;
