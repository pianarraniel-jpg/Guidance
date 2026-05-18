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

-- profiles: all authenticated users can read; owner can update
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- appointments: student sees own; counselor/admin see all; owner or counselor can insert/update/delete
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
CREATE POLICY "availability_select" ON availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "availability_manage" ON availability FOR ALL TO authenticated
  USING (counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- messages: sender or receiver can see; sender can insert
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- assessments: student sees own; counselors/admins see all
CREATE POLICY "assessments_select" ON assessments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));
CREATE POLICY "assessments_insert" ON assessments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "assessments_update" ON assessments FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));

-- assessment_tasks: student sees assigned; counselor manages their own; admin sees all
CREATE POLICY "assessment_tasks_select" ON assessment_tasks FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "assessment_tasks_insert" ON assessment_tasks FOR INSERT TO authenticated
  WITH CHECK (counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "assessment_tasks_update" ON assessment_tasks FOR UPDATE TO authenticated
  USING (counselor_id = auth.uid() OR student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- session_notes: counselors manage their own; admins see all
CREATE POLICY "session_notes_select" ON session_notes FOR SELECT TO authenticated
  USING (counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "session_notes_manage" ON session_notes FOR ALL TO authenticated
  USING (counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- notifications_read: users manage their own read state
CREATE POLICY "notifications_read_select" ON notifications_read FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_read_insert" ON notifications_read FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_read_delete" ON notifications_read FOR DELETE TO authenticated USING (user_id = auth.uid());
