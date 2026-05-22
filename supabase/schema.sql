-- GuidanceSync Supabase Schema
-- Run this in your Supabase SQL Editor (Database > SQL Editor > New query)

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('student', 'counselor', 'admin')),
  student_id  TEXT UNIQUE,
  staff_id    TEXT UNIQUE,
  department  TEXT,
  year_level  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  counselor_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  counselor_name TEXT NOT NULL,
  student_name   TEXT NOT NULL,
  date           TEXT NOT NULL,
  time           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  type           TEXT NOT NULL DEFAULT 'Wellness Check-in',
  location       TEXT,
  reason         TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AVAILABILITY
-- ============================================================
CREATE TABLE IF NOT EXISTS availability (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  counselor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  day          TEXT NOT NULL,
  slots        TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sender_role TEXT NOT NULL,
  text        TEXT NOT NULL,
  time        TEXT NOT NULL,
  timestamp   BIGINT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assessments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_name      TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('AI_CHAT', 'CLINICAL_FORM')),
  status            TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'evaluated')),
  stress_level      INTEGER,
  risk_level        TEXT CHECK (risk_level IN ('low', 'moderate', 'high')),
  summary           TEXT,
  questions         TEXT[],
  answers           JSONB,
  task_id           UUID,
  counselor_rating  INTEGER,
  counselor_comments TEXT,
  date              TEXT,
  timestamp         BIGINT NOT NULL,
  evaluated_at      BIGINT,
  focus_areas       TEXT[],
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Add risk_level to existing assessments tables (idempotent)
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high'));

-- ============================================================
-- ASSESSMENT TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS assessment_tasks (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  counselor_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  counselor_name    TEXT NOT NULL,
  student_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_name      TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  questions         TEXT[] NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'completed')),
  counselor_rating  INTEGER,
  counselor_comments TEXT,
  date              TEXT,
  timestamp         BIGINT NOT NULL,
  last_update       BIGINT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SESSION NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS session_notes (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  counselor_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  appointment_id      UUID REFERENCES appointments(id) ON DELETE SET NULL,
  stress_level        INTEGER,
  topics              TEXT[],
  client_reflections  TEXT,
  private_notes       TEXT,
  homework            JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPOINTMENT FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_feedback (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  counselor_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  counselor_name TEXT NOT NULL,
  student_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  feedback       TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI CHAT SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT NOT NULL DEFAULT '',
  summary      TEXT,
  stress_level INTEGER,
  risk_level   TEXT CHECK (risk_level IN ('low', 'moderate', 'high')),
  focus_areas  TEXT[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHAT ALERTS (high-risk keyword triggers)
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_alerts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_name     TEXT NOT NULL,
  session_id       UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  trigger_phrase   TEXT NOT NULL,
  message_content  TEXT NOT NULL,
  severity         TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('moderate', 'high', 'critical')),
  acknowledged     BOOLEAN DEFAULT FALSE,
  acknowledged_by  UUID REFERENCES profiles(id),
  acknowledged_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS READ STATE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications_read (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notification_id TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, notification_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_read  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_alerts         ENABLE ROW LEVEL SECURITY;

-- profiles: all authenticated users can read; owner can update
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- appointments: student sees own; counselor/admin see all; owner or counselor can insert/update/delete
DROP POLICY IF EXISTS "appointments_select" ON appointments;
DROP POLICY IF EXISTS "appointments_insert" ON appointments;
DROP POLICY IF EXISTS "appointments_update" ON appointments;
DROP POLICY IF EXISTS "appointments_delete" ON appointments;
CREATE POLICY "appointments_select" ON appointments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR counselor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin'))
  );
CREATE POLICY "appointments_insert" ON appointments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));
CREATE POLICY "appointments_update" ON appointments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')) OR student_id = auth.uid());
CREATE POLICY "appointments_delete" ON appointments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));

-- availability: all authenticated users can read; counselors manage their own
DROP POLICY IF EXISTS "availability_select" ON availability;
DROP POLICY IF EXISTS "availability_manage" ON availability;
CREATE POLICY "availability_select" ON availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "availability_manage" ON availability FOR ALL TO authenticated
  USING (counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- messages: sender or receiver can see; sender can insert
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- assessments: student sees own; counselors/admins see all
DROP POLICY IF EXISTS "assessments_select" ON assessments;
DROP POLICY IF EXISTS "assessments_insert" ON assessments;
DROP POLICY IF EXISTS "assessments_update" ON assessments;
CREATE POLICY "assessments_select" ON assessments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));
CREATE POLICY "assessments_insert" ON assessments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "assessments_update" ON assessments FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));

-- assessment_tasks: student sees assigned; counselor manages their own; admin sees all
DROP POLICY IF EXISTS "assessment_tasks_select" ON assessment_tasks;
DROP POLICY IF EXISTS "assessment_tasks_insert" ON assessment_tasks;
DROP POLICY IF EXISTS "assessment_tasks_update" ON assessment_tasks;
CREATE POLICY "assessment_tasks_select" ON assessment_tasks FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "assessment_tasks_insert" ON assessment_tasks FOR INSERT TO authenticated
  WITH CHECK (counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "assessment_tasks_update" ON assessment_tasks FOR UPDATE TO authenticated
  USING (counselor_id = auth.uid() OR student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- session_notes: counselors manage their own; admins see all
DROP POLICY IF EXISTS "session_notes_select" ON session_notes;
DROP POLICY IF EXISTS "session_notes_manage" ON session_notes;
CREATE POLICY "session_notes_select" ON session_notes FOR SELECT TO authenticated
  USING (counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "session_notes_manage" ON session_notes FOR ALL TO authenticated
  USING (counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- appointment_feedback: counselors can submit feedback, students and admins may read their own feedback
DROP POLICY IF EXISTS "appointment_feedback_select" ON appointment_feedback;
DROP POLICY IF EXISTS "appointment_feedback_insert" ON appointment_feedback;
DROP POLICY IF EXISTS "appointment_feedback_update" ON appointment_feedback;
CREATE POLICY "appointment_feedback_select" ON appointment_feedback FOR SELECT TO authenticated
  USING (counselor_id = auth.uid() OR student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "appointment_feedback_insert" ON appointment_feedback FOR INSERT TO authenticated
  WITH CHECK (counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "appointment_feedback_update" ON appointment_feedback FOR UPDATE TO authenticated
  USING (counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- notifications_read: users manage their own read state
DROP POLICY IF EXISTS "notifications_read_select" ON notifications_read;
DROP POLICY IF EXISTS "notifications_read_insert" ON notifications_read;
DROP POLICY IF EXISTS "notifications_read_delete" ON notifications_read;
CREATE POLICY "notifications_read_select" ON notifications_read FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_read_insert" ON notifications_read FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_read_delete" ON notifications_read FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ai_chat_sessions: student sees own; counselors/admins see all
DROP POLICY IF EXISTS "ai_chat_sessions_select" ON ai_chat_sessions;
DROP POLICY IF EXISTS "ai_chat_sessions_insert" ON ai_chat_sessions;
DROP POLICY IF EXISTS "ai_chat_sessions_update" ON ai_chat_sessions;
CREATE POLICY "ai_chat_sessions_select" ON ai_chat_sessions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));
CREATE POLICY "ai_chat_sessions_insert" ON ai_chat_sessions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "ai_chat_sessions_update" ON ai_chat_sessions FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));

-- ai_chat_messages: student sees own session messages; counselors/admins see all
DROP POLICY IF EXISTS "ai_chat_messages_select" ON ai_chat_messages;
DROP POLICY IF EXISTS "ai_chat_messages_insert" ON ai_chat_messages;
CREATE POLICY "ai_chat_messages_select" ON ai_chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM ai_chat_sessions s WHERE s.id = session_id AND s.student_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin'))
  );
CREATE POLICY "ai_chat_messages_insert" ON ai_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM ai_chat_sessions s WHERE s.id = session_id AND s.student_id = auth.uid())
  );

-- chat_alerts: students can insert their own; counselors/admins can read and update (acknowledge)
DROP POLICY IF EXISTS "chat_alerts_select" ON chat_alerts;
DROP POLICY IF EXISTS "chat_alerts_insert" ON chat_alerts;
DROP POLICY IF EXISTS "chat_alerts_update" ON chat_alerts;
CREATE POLICY "chat_alerts_select" ON chat_alerts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));
CREATE POLICY "chat_alerts_insert" ON chat_alerts FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "chat_alerts_update" ON chat_alerts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));
