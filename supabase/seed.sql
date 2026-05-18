-- GuidanceSync Seed Data
-- Run AFTER schema.sql in the Supabase SQL Editor.
--
-- Credentials:
--   Student   → email: student@uspf.edu.ph    password: 2024-0001   (also the Student ID login)
--   Counselor → email: counselor@uspf.edu.ph   password: password123
--   Admin     → email: admin@uspf.edu.ph        password: password123

DO $$
DECLARE
  v_student_id   UUID := gen_random_uuid();
  v_counselor_id UUID := gen_random_uuid();
  v_admin_id     UUID := gen_random_uuid();
BEGIN

-- ── 1. Auth users ──────────────────────────────────────────────────────────
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  is_super_admin
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    v_student_id,
    'authenticated', 'authenticated',
    'student@uspf.edu.ph',
    crypt('2024-0001', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Juan Dela Cruz","role":"student"}'::jsonb,
    now(), now(), '', '', '', '', false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    v_counselor_id,
    'authenticated', 'authenticated',
    'counselor@uspf.edu.ph',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"USPF Counselor","role":"counselor"}'::jsonb,
    now(), now(), '', '', '', '', false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated', 'authenticated',
    'admin@uspf.edu.ph',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Admin User","role":"admin"}'::jsonb,
    now(), now(), '', '', '', '', false
  );

-- ── 2. Auth identities (required for email/password sign-in) ───────────────
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    gen_random_uuid(), v_student_id, 'student@uspf.edu.ph',
    jsonb_build_object('sub', v_student_id::text, 'email', 'student@uspf.edu.ph', 'email_verified', true),
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(), v_counselor_id, 'counselor@uspf.edu.ph',
    jsonb_build_object('sub', v_counselor_id::text, 'email', 'counselor@uspf.edu.ph', 'email_verified', true),
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(), v_admin_id, 'admin@uspf.edu.ph',
    jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@uspf.edu.ph', 'email_verified', true),
    'email', now(), now(), now()
  );

-- ── 3. Profiles (upsert over the trigger-created rows) ─────────────────────
INSERT INTO profiles (id, name, email, role, student_id, created_at)
VALUES
  (v_student_id,   'Juan Dela Cruz', 'student@uspf.edu.ph',   'student',   '2024-0001', now()),
  (v_counselor_id, 'USPF Counselor', 'counselor@uspf.edu.ph', 'counselor', NULL,        now()),
  (v_admin_id,     'Admin User',     'admin@uspf.edu.ph',     'admin',     NULL,        now())
ON CONFLICT (id) DO UPDATE
  SET name       = EXCLUDED.name,
      role       = EXCLUDED.role,
      student_id = EXCLUDED.student_id;

-- ── 4. Counselor availability ──────────────────────────────────────────────
INSERT INTO availability (counselor_id, day, slots)
VALUES
  (v_counselor_id, 'Monday',    ARRAY['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']),
  (v_counselor_id, 'Wednesday', ARRAY['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']),
  (v_counselor_id, 'Friday',    ARRAY['09:00 AM', '10:00 AM', '11:00 AM']);

END $$;
