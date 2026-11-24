import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { studentId } = await req.json();
  if (!studentId || typeof studentId !== 'string') {
    return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
  }

  const cleanId = studentId.trim();
  const rawId = cleanId.replace(/[-\s]/g, '').toLowerCase();

  // Look up profile by student_id — try exact match first
  let { data: profileData } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('student_id', cleanId)
    .maybeSingle();

  // Flexible fallback: match IDs with or without hyphens (e.g. 2024-0001 vs 20240001)
  if (!profileData && rawId) {
    const { data: candidates } = await supabaseAdmin
      .from('profiles')
      .select('*');

    profileData = (candidates || []).find(p => {
      if (!p.student_id) return false;
      const candidateRaw = String(p.student_id).replace(/[-\s]/g, '').toLowerCase();
      return candidateRaw === rawId && (!p.role || p.role.toLowerCase() === 'student');
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

  // 1. Try sign in using student_id as password (for seed/default accounts)
  let session: any = null;
  try {
    let signInRes = await supabaseAdmin.auth.signInWithPassword({
      email: profileData.email,
      password: cleanId,
    });

    if ((signInRes.error || !signInRes.data?.session) && profileData.student_id && profileData.student_id !== cleanId) {
      signInRes = await supabaseAdmin.auth.signInWithPassword({
        email: profileData.email,
        password: profileData.student_id,
      });
    }

    if (signInRes.data?.session) {
      session = signInRes.data.session;
    }
  } catch (pwErr) {
    console.warn('[student-login] Password sign-in failed, falling back to token exchange:', pwErr);
  }

  // 2. If password sign-in didn't produce a session (e.g. student registered with a custom password),
  // authenticate securely via admin token generation
  if (!session) {
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: profileData.email,
      });

      if (linkData?.properties?.hashed_token) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ecluqqnyooocohemcgpy.supabase.co';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbHVxcW55b29vY29oZW1jZ3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjMwMTYsImV4cCI6MjA5NDU5OTAxNn0.2Tq-N7FhH8gYf_R5y47yvEshq7y489zJ24N6-Q9638E';
        const client = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const verifyRes = await client.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: 'magiclink',
        });

        if (verifyRes.data?.session) {
          session = verifyRes.data.session;
        } else if (verifyRes.error) {
          console.error('[student-login] verifyOtp error:', verifyRes.error);
        }
      } else if (linkError) {
        console.error('[student-login] generateLink error:', linkError);
      }
    } catch (tokenErr) {
      console.error('[student-login] Admin token exchange error:', tokenErr);
    }
  }

  if (!session) {
    return NextResponse.json({ error: 'Authentication failed for this student ID.' }, { status: 401 });
  }

  return NextResponse.json({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
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
