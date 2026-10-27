import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { studentId } = await req.json();
  if (!studentId || typeof studentId !== 'string') {
    return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
  }

  const cleanId = studentId.trim();
  const rawId = cleanId.replace(/[-\s]/g, '');

  // Look up profile by student_id — try exact match first
  let { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('student_id', cleanId)
    .maybeSingle();

  // Flexible fallback: match IDs with or without hyphens (e.g. 2024-0001 vs 20240001)
  if (!profileData && rawId) {
    const { data: candidates } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'student');

    profileData = (candidates || []).find(p => {
      if (!p.student_id) return false;
      const candidateRaw = p.student_id.replace(/[-\s]/g, '');
      return candidateRaw === rawId;
    }) || null;
  }

  if (!profileData) {
    return NextResponse.json({ error: 'Student ID not recognized. Please check your ID number.' }, { status: 404 });
  }

  // Auto-confirm student email if it is currently unconfirmed
  try {
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(profileData.id);
    if (authUser && !authUser.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(profileData.id, { email_confirm: true });
    }
  } catch (err) {
    console.error('[student-login] Failed to auto-confirm user email:', err);
  }

  // Sign in using student_id as password (try clean input, then canonical profile student_id)
  let signInRes = await supabaseAdmin.auth.signInWithPassword({
    email: profileData.email,
    password: cleanId,
  });

  if ((signInRes.error || !signInRes.data.session) && profileData.student_id && profileData.student_id !== cleanId) {
    signInRes = await supabaseAdmin.auth.signInWithPassword({
      email: profileData.email,
      password: profileData.student_id,
    });
  }

  if (signInRes.error || !signInRes.data.session) {
    return NextResponse.json({ error: 'Authentication failed for this student ID.' }, { status: 401 });
  }

  return NextResponse.json({
    accessToken: signInRes.data.session.access_token,
    refreshToken: signInRes.data.session.refresh_token,
    profile: {
      id: profileData.id,
      name: profileData.name,
      email: profileData.email,
      role: profileData.role,
      studentId: profileData.student_id ?? undefined,
      department: profileData.department ?? undefined,
      program: profileData.program || profileData.course || undefined,
      yearLevel: profileData.year_level || profileData.year || undefined,
    },
  });
}
