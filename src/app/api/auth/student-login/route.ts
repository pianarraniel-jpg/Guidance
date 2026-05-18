import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { studentId } = await req.json();
  if (!studentId) {
    return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
  }

  // Look up profile by student_id — fetch full profile to avoid a second round-trip on the client
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, name, email, role, student_id')
    .eq('student_id', studentId.trim())
    .maybeSingle();

  if (profileError || !profileData) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // Sign in using student_id as the password (set during seed/registration)
  const { data, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: profileData.email,
    password: studentId.trim(),
  });

  if (signInError || !data.session) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  return NextResponse.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    profile: {
      id: profileData.id,
      name: profileData.name,
      email: profileData.email,
      role: profileData.role,
      studentId: profileData.student_id ?? undefined,
    },
  });
}
