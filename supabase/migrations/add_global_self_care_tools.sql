-- Migration: Add global_self_care_tools table
CREATE TABLE IF NOT EXISTS global_self_care_tools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE global_self_care_tools ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "global_self_care_select" ON global_self_care_tools;
DROP POLICY IF EXISTS "global_self_care_all" ON global_self_care_tools;

CREATE POLICY "global_self_care_select" ON global_self_care_tools FOR SELECT TO authenticated USING (true);
CREATE POLICY "global_self_care_all" ON global_self_care_tools FOR ALL TO authenticated USING (true);
