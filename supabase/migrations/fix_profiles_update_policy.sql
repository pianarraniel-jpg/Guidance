-- Migration: Allow counselors and admins to update any student profile
-- Run this in Supabase SQL Editor

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin'))
  );
