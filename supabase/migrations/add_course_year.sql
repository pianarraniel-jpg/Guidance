-- Migration: Add Course & Year to profiles
-- Run this in Supabase SQL Editor if profiles table already exists

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year TEXT;
