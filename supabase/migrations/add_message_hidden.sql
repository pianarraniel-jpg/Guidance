-- Migration: Add hidden flag to messages and ai_chat_messages
-- Run in Supabase SQL Editor after fix_profiles_update_policy.sql

ALTER TABLE messages ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;
