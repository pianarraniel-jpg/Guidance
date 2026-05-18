-- AI Chat Tables for GuidanceSync
-- Run in Supabase SQL Editor after schema.sql

-- ── ai_chat_sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  summary      TEXT,
  stress_level INTEGER,
  focus_areas  TEXT[],
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own sessions"
  ON ai_chat_sessions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students create own sessions"
  ON ai_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update own sessions"
  ON ai_chat_sessions FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Counselors read all sessions"
  ON ai_chat_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('counselor', 'admin')
    )
  );

-- ── ai_chat_messages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own messages"
  ON ai_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id
        AND ai_chat_sessions.student_id = auth.uid()
    )
  );

CREATE POLICY "Students create own messages"
  ON ai_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id
        AND ai_chat_sessions.student_id = auth.uid()
    )
  );

CREATE POLICY "Counselors read all messages"
  ON ai_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('counselor', 'admin')
    )
  );

-- ── ai_insights ──────────────────────────────────────────────────────────────
-- Caches the latest AI-generated insight per student (refreshed on each check-in)
CREATE TABLE IF NOT EXISTS ai_insights (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insight    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own insight"
  ON ai_insights FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students upsert own insight"
  ON ai_insights FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update own insight"
  ON ai_insights FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Counselors read all insights"
  ON ai_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('counselor', 'admin')
    )
  );
