  -- Migration: Add Chat Monitoring (run this in Supabase SQL Editor)
  -- Adds: ai_chat_sessions, ai_chat_messages, chat_alerts tables
  -- Adds: risk_level column to assessments

  -- ============================================================
  -- ADD risk_level TO assessments
  -- ============================================================
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high'));

  -- ============================================================
  -- PATCH ai_chat_sessions if it already exists without student_name
  -- ============================================================
  ALTER TABLE ai_chat_sessions ADD COLUMN IF NOT EXISTS student_name TEXT NOT NULL DEFAULT '';

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
  -- CHAT ALERTS
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
  -- ROW LEVEL SECURITY
  -- ============================================================
  ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chat_alerts      ENABLE ROW LEVEL SECURITY;

  -- ai_chat_sessions
  DROP POLICY IF EXISTS "ai_chat_sessions_select" ON ai_chat_sessions;
  DROP POLICY IF EXISTS "ai_chat_sessions_insert" ON ai_chat_sessions;
  DROP POLICY IF EXISTS "ai_chat_sessions_update" ON ai_chat_sessions;

  CREATE POLICY "ai_chat_sessions_select" ON ai_chat_sessions FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));
  CREATE POLICY "ai_chat_sessions_insert" ON ai_chat_sessions FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());
  CREATE POLICY "ai_chat_sessions_update" ON ai_chat_sessions FOR UPDATE TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));

  -- ai_chat_messages
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

  -- chat_alerts
  DROP POLICY IF EXISTS "chat_alerts_select" ON chat_alerts;
  DROP POLICY IF EXISTS "chat_alerts_insert" ON chat_alerts;
  DROP POLICY IF EXISTS "chat_alerts_update" ON chat_alerts;

  CREATE POLICY "chat_alerts_select" ON chat_alerts FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));
  CREATE POLICY "chat_alerts_insert" ON chat_alerts FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());
  CREATE POLICY "chat_alerts_update" ON chat_alerts FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('counselor', 'admin')));
