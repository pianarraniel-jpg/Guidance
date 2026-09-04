import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { USER_ROLES } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, studentId, email, department, password } = body;

    // 1. Required fields validation
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First name and Last name are required.' }, { status: 400 });
    }
    if (!studentId?.trim()) {
      return NextResponse.json({ error: 'Student ID Number is required.' }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'University email is required.' }, { status: 400 });
    }
    if (!department?.trim()) {
      return NextResponse.json({ error: 'Please select your department / college.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const fullName = `${cleanFirstName} ${cleanLastName}`;
    const cleanStudentId = studentId.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 2. University Email domain verification (@uspf.edu.ph)
    if (!cleanEmail.endsWith('@uspf.edu.ph')) {
      return NextResponse.json(
        { error: 'Only official university email addresses ending with @uspf.edu.ph are permitted.' },
        { status: 400 }
      );
    }

    // 3. Student ID format verification (e.g. 202300958 or 2023-00958)
    const studentIdRegex = /^(\d{4}-?\d{4,5}|\d{7,10})$/;
    if (!studentIdRegex.test(cleanStudentId)) {
      return NextResponse.json(
        { error: 'Invalid Student ID format. Please use a valid university student ID (e.g. 202300958 or 2023-00958).' },
        { status: 400 }
      );
    }

    // 4. Duplicate checks in profiles
    const { data: existingStudentId } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('student_id', cleanStudentId)
      .maybeSingle();

    if (existingStudentId) {
      return NextResponse.json(
        { error: `Student ID "${cleanStudentId}" is already registered in the system.` },
        { status: 400 }
      );
    }

    const { data: existingEmail } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingEmail) {
      return NextResponse.json(
        { error: `The email "${cleanEmail}" is already registered. Please log in.` },
        { status: 400 }
      );
    }

    // 5. Create Auth user via Supabase Admin (auto-confirmed for instant login)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: fullName,
        role: USER_ROLES.STUDENT,
        student_id: cleanStudentId,
        department: department.trim(),
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create student account.' },
        { status: 400 }
      );
    }

    // 6. Upsert user record into profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        name: fullName,
        email: cleanEmail,
        role: USER_ROLES.STUDENT,
        student_id: cleanStudentId,
        department: department.trim(),
      });

    if (profileError) {
      console.error('[student-register] Error upserting profile:', profileError);
    }

    return NextResponse.json({
      success: true,
      message: 'Student account successfully created! You can now log in.',
    });
  } catch (err: any) {
    console.error('[student-register] Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'An unexpected error occurred during registration.' },
      { status: 500 }
    );
  }
}
