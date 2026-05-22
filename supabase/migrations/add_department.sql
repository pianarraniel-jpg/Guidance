-- Migration: Add Department & Year Level to profiles
-- Run this in Supabase SQL Editor after add_chat_monitoring.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year_level TEXT;
