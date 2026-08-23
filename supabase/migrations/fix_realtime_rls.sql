-- Migration: Fix Realtime RLS Policies (Replace Subqueries with auth.jwt() checks)
-- Run this in your Supabase SQL Editor to make Realtime events work for Counselors and Admins.

-- 1. profiles
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin'));

-- 2. appointments
DROP POLICY IF EXISTS "appointments_select" ON appointments;
DROP POLICY IF EXISTS "appointments_insert" ON appointments;
DROP POLICY IF EXISTS "appointments_update" ON appointments;
DROP POLICY IF EXISTS "appointments_delete" ON appointments;

CREATE POLICY "appointments_select" ON appointments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR counselor_id = auth.uid()
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin')
  );
CREATE POLICY "appointments_insert" ON appointments FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin')
  );
CREATE POLICY "appointments_update" ON appointments FOR UPDATE TO authenticated
  USING (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin') 
    OR student_id = auth.uid()
  );
CREATE POLICY "appointments_delete" ON appointments FOR DELETE TO authenticated
  USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin'));

-- 3. availability
DROP POLICY IF EXISTS "availability_manage" ON availability;
CREATE POLICY "availability_manage" ON availability FOR ALL TO authenticated
  USING (
    counselor_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

-- 4. assessments
DROP POLICY IF EXISTS "assessments_select" ON assessments;
DROP POLICY IF EXISTS "assessments_update" ON assessments;

CREATE POLICY "assessments_select" ON assessments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin')
  );
CREATE POLICY "assessments_update" ON assessments FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin')
  );

-- 5. assessment_tasks
DROP POLICY IF EXISTS "assessment_tasks_select" ON assessment_tasks;
DROP POLICY IF EXISTS "assessment_tasks_insert" ON assessment_tasks;
DROP POLICY IF EXISTS "assessment_tasks_update" ON assessment_tasks;

CREATE POLICY "assessment_tasks_select" ON assessment_tasks FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() 
    OR counselor_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );
CREATE POLICY "assessment_tasks_insert" ON assessment_tasks FOR INSERT TO authenticated
  WITH CHECK (
    counselor_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );
CREATE POLICY "assessment_tasks_update" ON assessment_tasks FOR UPDATE TO authenticated
  USING (
    counselor_id = auth.uid() 
    OR student_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

-- 6. session_notes
DROP POLICY IF EXISTS "session_notes_select" ON session_notes;
DROP POLICY IF EXISTS "session_notes_manage" ON session_notes;

CREATE POLICY "session_notes_select" ON session_notes FOR SELECT TO authenticated
  USING (
    counselor_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );
CREATE POLICY "session_notes_manage" ON session_notes FOR ALL TO authenticated
  USING (
    counselor_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

-- 7. appointment_feedback
DROP POLICY IF EXISTS "appointment_feedback_select" ON appointment_feedback;
DROP POLICY IF EXISTS "appointment_feedback_insert" ON appointment_feedback;
DROP POLICY IF EXISTS "appointment_feedback_update" ON appointment_feedback;

CREATE POLICY "appointment_feedback_select" ON appointment_feedback FOR SELECT TO authenticated
  USING (
    counselor_id = auth.uid() 
    OR student_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );
CREATE POLICY "appointment_feedback_insert" ON appointment_feedback FOR INSERT TO authenticated
  WITH CHECK (
    counselor_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );
CREATE POLICY "appointment_feedback_update" ON appointment_feedback FOR UPDATE TO authenticated
  USING (
    counselor_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

-- 8. ai_chat_sessions
DROP POLICY IF EXISTS "ai_chat_sessions_select" ON ai_chat_sessions;
DROP POLICY IF EXISTS "ai_chat_sessions_update" ON ai_chat_sessions;

CREATE POLICY "ai_chat_sessions_select" ON ai_chat_sessions FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin')
  );
CREATE POLICY "ai_chat_sessions_update" ON ai_chat_sessions FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid() 
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin')
  );

-- 9. ai_chat_messages
DROP POLICY IF EXISTS "ai_chat_messages_select" ON ai_chat_messages;
CREATE POLICY "ai_chat_messages_select" ON ai_chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM ai_chat_sessions s WHERE s.id = session_id AND s.student_id = auth.uid())
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin')
  );

-- 10. chat_alerts
DROP POLICY IF EXISTS "chat_alerts_select" ON chat_alerts;
DROP POLICY IF EXISTS "chat_alerts_update" ON chat_alerts;

CREATE POLICY "chat_alerts_select" ON chat_alerts FOR SELECT TO authenticated
  USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin'));
CREATE POLICY "chat_alerts_update" ON chat_alerts FOR UPDATE TO authenticated
  USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('counselor', 'admin'));
