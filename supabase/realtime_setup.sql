-- GuidanceSync Realtime Setup
-- Run in Supabase SQL Editor to enable live push events.
-- Without this, postgres_changes subscriptions will NOT fire.

-- REPLICA IDENTITY FULL is required for row-level filters (student_id=eq.xxx)
-- to work on UPDATE and DELETE events.
ALTER TABLE appointments       REPLICA IDENTITY FULL;
ALTER TABLE messages           REPLICA IDENTITY FULL;
ALTER TABLE assessments        REPLICA IDENTITY FULL;
ALTER TABLE assessment_tasks   REPLICA IDENTITY FULL;

-- Add all tables that need live updates to the Supabase realtime publication.
-- By default new tables are NOT added automatically.
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE assessment_tasks;
