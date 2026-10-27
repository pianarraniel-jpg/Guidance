-- Migration: Add course, program, department, and year_level columns to profiles table
-- Run this in your Supabase SQL Editor if profiles is missing any of these columns:

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS program TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year_level TEXT;
