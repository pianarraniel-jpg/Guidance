-- GuidanceSync Seed Data
-- Run AFTER schema.sql in the Supabase SQL Editor.
--
-- Credentials:
--   Admin     → email: admin@uspf.edu.ph        password: password123
--   Counselor → email: counselor@uspf.edu.ph   password: password123

DO $$
DECLARE
  v_admin_id     UUID;
  v_counselor_id UUID;
  v_counselor_ccs_id UUID;
  v_counselor_cea_id UUID;
  v_counselor_cteas_id UUID;
BEGIN

-- Check if the admin user already exists
SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@uspf.edu.ph';

-- If not, create the user
IF v_admin_id IS NULL THEN
  v_admin_id := gen_random_uuid();
  
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
      v_admin_id,
      'authenticated', 'authenticated',
      'admin@uspf.edu.ph',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Admin User","role":"admin"}'::jsonb,
      now(), now(), '', '', '', '', false
    );

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
      gen_random_uuid(), v_admin_id, 'admin@uspf.edu.ph',
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@uspf.edu.ph', 'email_verified', true),
      'email', now(), now(), now()
    );
END IF;

-- Check if the counselor user already exists
SELECT id INTO v_counselor_id FROM auth.users WHERE email = 'counselor@uspf.edu.ph';

-- If not, create the counselor user
IF v_counselor_id IS NULL THEN
  v_counselor_id := gen_random_uuid();
  
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
      v_counselor_id,
      'authenticated', 'authenticated',
      'counselor@uspf.edu.ph',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"USPF Counselor","role":"counselor"}'::jsonb,
      now(), now(), '', '', '', '', false
    );

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
      gen_random_uuid(), v_counselor_id, 'counselor@uspf.edu.ph',
      jsonb_build_object('sub', v_counselor_id::text, 'email', 'counselor@uspf.edu.ph', 'email_verified', true),
      'email', now(), now(), now()
    );
END IF;

-- Check if the CCS counselor user already exists
SELECT id INTO v_counselor_ccs_id FROM auth.users WHERE email = 'counselor_ccs@uspf.edu.ph';

-- If not, create the CCS counselor user
IF v_counselor_ccs_id IS NULL THEN
  v_counselor_ccs_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_super_admin
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000000', v_counselor_ccs_id,
      'authenticated', 'authenticated', 'counselor_ccs@uspf.edu.ph',
      crypt('password123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"CCS Counselor","role":"counselor"}'::jsonb,
      now(), now(), false
    );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), v_counselor_ccs_id, 'counselor_ccs@uspf.edu.ph',
      jsonb_build_object('sub', v_counselor_ccs_id::text, 'email', 'counselor_ccs@uspf.edu.ph', 'email_verified', true),
      'email', now(), now(), now()
    );
END IF;

-- Check if the CEA counselor user already exists
SELECT id INTO v_counselor_cea_id FROM auth.users WHERE email = 'counselor_cea@uspf.edu.ph';

-- If not, create the CEA counselor user
IF v_counselor_cea_id IS NULL THEN
  v_counselor_cea_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_super_admin
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000000', v_counselor_cea_id,
      'authenticated', 'authenticated', 'counselor_cea@uspf.edu.ph',
      crypt('password123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"CEA Counselor","role":"counselor"}'::jsonb,
      now(), now(), false
    );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), v_counselor_cea_id, 'counselor_cea@uspf.edu.ph',
      jsonb_build_object('sub', v_counselor_cea_id::text, 'email', 'counselor_cea@uspf.edu.ph', 'email_verified', true),
      'email', now(), now(), now()
    );
END IF;

-- Check if the CTEAS counselor user already exists
SELECT id INTO v_counselor_cteas_id FROM auth.users WHERE email = 'counselor_cteas@uspf.edu.ph';

-- If not, create the CTEAS counselor user
IF v_counselor_cteas_id IS NULL THEN
  v_counselor_cteas_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_super_admin
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000000', v_counselor_cteas_id,
      'authenticated', 'authenticated', 'counselor_cteas@uspf.edu.ph',
      crypt('password123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"CTEAS Counselor","role":"counselor"}'::jsonb,
      now(), now(), false
    );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), v_counselor_cteas_id, 'counselor_cteas@uspf.edu.ph',
      jsonb_build_object('sub', v_counselor_cteas_id::text, 'email', 'counselor_cteas@uspf.edu.ph', 'email_verified', true),
      'email', now(), now(), now()
    );
END IF;

-- ── 3. Profiles (upsert over the trigger-created rows) ─────────────────────
INSERT INTO profiles (id, name, email, role, student_id, department, created_at)
VALUES
  (v_admin_id,     'Admin User',     'admin@uspf.edu.ph',     'admin',     NULL, NULL, now()),
  (v_counselor_id, 'USPF Counselor', 'counselor@uspf.edu.ph', 'counselor', NULL, NULL, now()),
  (v_counselor_ccs_id, 'CCS Counselor', 'counselor_ccs@uspf.edu.ph', 'counselor', NULL, 'CCS', now()),
  (v_counselor_cea_id, 'CEA Counselor', 'counselor_cea@uspf.edu.ph', 'counselor', NULL, 'CEA', now()),
  (v_counselor_cteas_id, 'CTEAS Counselor', 'counselor_cteas@uspf.edu.ph', 'counselor', NULL, 'CTEAS', now())
ON CONFLICT (id) DO UPDATE
  SET name       = EXCLUDED.name,
      role       = EXCLUDED.role,
      student_id = EXCLUDED.student_id,
      department = EXCLUDED.department;

-- ── 4. Counselor availability ──────────────────────────────────────────────
IF v_counselor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM availability WHERE counselor_id = v_counselor_id) THEN
  INSERT INTO availability (counselor_id, day, slots)
  VALUES
    (v_counselor_id, 'Monday',    ARRAY['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']),
    (v_counselor_id, 'Wednesday', ARRAY['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']),
    (v_counselor_id, 'Friday',    ARRAY['09:00 AM', '10:00 AM', '11:00 AM']);
END IF;

IF v_counselor_ccs_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM availability WHERE counselor_id = v_counselor_ccs_id) THEN
  INSERT INTO availability (counselor_id, day, slots)
  VALUES
    (v_counselor_ccs_id, 'Monday',    ARRAY['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']),
    (v_counselor_ccs_id, 'Wednesday', ARRAY['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']),
    (v_counselor_ccs_id, 'Friday',    ARRAY['09:00 AM', '10:00 AM', '11:00 AM']);
END IF;

IF v_counselor_cea_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM availability WHERE counselor_id = v_counselor_cea_id) THEN
  INSERT INTO availability (counselor_id, day, slots)
  VALUES
    (v_counselor_cea_id, 'Monday',    ARRAY['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']),
    (v_counselor_cea_id, 'Wednesday', ARRAY['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']),
    (v_counselor_cea_id, 'Friday',    ARRAY['09:00 AM', '10:00 AM', '11:00 AM']);
END IF;

IF v_counselor_cteas_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM availability WHERE counselor_id = v_counselor_cteas_id) THEN
  INSERT INTO availability (counselor_id, day, slots)
  VALUES
    (v_counselor_cteas_id, 'Monday',    ARRAY['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']),
    (v_counselor_cteas_id, 'Wednesday', ARRAY['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']),
    (v_counselor_cteas_id, 'Friday',    ARRAY['09:00 AM', '10:00 AM', '11:00 AM']);
END IF;

END $$;
