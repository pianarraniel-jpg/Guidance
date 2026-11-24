import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendConfirmationEmailViaNodemailer } from '@/lib/nodemailer-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || 
                   (req.headers.get('x-forwarded-host') ? `https://${req.headers.get('x-forwarded-host')}` : undefined) ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

    const body = await req.json().catch(() => ({}));
    let {
      appointmentId,
      studentId,
      toEmail,
      studentName,
      counselorName,
      date,
      time,
      type,
      location,
      meetingLink,
    } = body;

    // 1. Fetch missing appointment details from Supabase if appointmentId is present
    if (appointmentId && (!toEmail || !date || !time)) {
      const { data: appointment } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .maybeSingle();

      if (appointment) {
        studentId = studentId || appointment.student_id;
        studentName = studentName || appointment.student_name;
        counselorName = counselorName || appointment.counselor_name;
        date = date || appointment.date;
        time = time || appointment.time;
        type = type || appointment.type;
        location = location || appointment.location;
      }
    }

    // 2. Fetch student's email from profiles if not provided
    if (!toEmail && studentId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', studentId)
        .maybeSingle();

      if (profile?.email) {
        toEmail = profile.email;
        if (!studentName) studentName = profile.name;
      }
    }

    if (!toEmail) {
      return NextResponse.json(
        { success: false, error: 'Student email could not be located.' },
        { status: 400 }
      );
    }

    // 3. Send email via open-source nodemailer
    const result = await sendConfirmationEmailViaNodemailer({
      toEmail,
      studentName: studentName || 'Student',
      counselorName: counselorName || 'Guidance Counselor',
      date: date || '',
      time: time || '',
      type: type || 'Counseling Session',
      location: location || 'Guidance Office — Room 302',
      appointmentId: appointmentId || '',
      meetingLink: meetingLink || undefined,
      origin: origin || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent successfully',
      result,
    });
  } catch (error: any) {
    console.error('[API: confirm-email] Failed to send email:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send confirmation email' },
      { status: 500 }
    );
  }
}
