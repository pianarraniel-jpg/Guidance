-- Migration: Add worksheets table and storage bucket
CREATE TABLE IF NOT EXISTS worksheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  pages TEXT NOT NULL,
  file_size TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE worksheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worksheets_select" ON worksheets;
DROP POLICY IF EXISTS "worksheets_all" ON worksheets;

CREATE POLICY "worksheets_select" ON worksheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "worksheets_all" ON worksheets FOR ALL TO authenticated USING (true);

-- Seed worksheets with initial worksheets
INSERT INTO worksheets (title, description, category, pages, file_size, file_url)
VALUES
  ('Exam Anxiety Management Guide', 'Evidence-based strategies and techniques to reduce exam-related stress.', 'Stress Management', '8 pages', '2.4 MB', '/mock-worksheets/exam_anxiety.pdf'),
  ('Sleep Hygiene Checklist', 'Daily routine template to improve sleep quality and academic performance.', 'Self-Care', '4 pages', '1.1 MB', '/mock-worksheets/sleep_hygiene.pdf'),
  ('Cognitive Reframing Worksheet', 'Interactive tool to challenge negative thoughts and build resilience.', 'Mental Wellness', '6 pages', '1.8 MB', '/mock-worksheets/cognitive_reframing.pdf'),
  ('Time Management & Study Planner', 'Semester planner and weekly study schedule templates.', 'Academic', '10 pages', '3.2 MB', '/mock-worksheets/time_management.pdf'),
  ('Mindfulness & Grounding Techniques', 'Step-by-step guides for 5, 10, and 15-minute mindfulness practices.', 'Mindfulness', '7 pages', '2.1 MB', '/mock-worksheets/mindfulness_grounding.pdf')
ON CONFLICT DO NOTHING;

-- Storage bucket for worksheets (runs only if storage schema exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('worksheets', 'worksheets', true)
    ON CONFLICT (id) DO NOTHING;

    -- Bucket Policies
    DROP POLICY IF EXISTS "public_select" ON storage.objects;
    DROP POLICY IF EXISTS "auth_insert" ON storage.objects;
    DROP POLICY IF EXISTS "auth_delete" ON storage.objects;

    CREATE POLICY "public_select" ON storage.objects FOR SELECT USING (bucket_id = 'worksheets');
    CREATE POLICY "auth_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'worksheets' AND auth.role() = 'authenticated');
    CREATE POLICY "auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'worksheets' AND auth.role() = 'authenticated');
  END IF;
END $$;
