import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { APPOINTMENT_STATUS } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const counselorId = searchParams.get('counselorId');
    const date = searchParams.get('date');

    if (!counselorId || !date) {
      return NextResponse.json({ bookedSlots: [] });
    }

    // Query all active (non-cancelled) appointments for this counselor on this date
    // Uses supabaseAdmin to bypass student Row-Level Security restrictions safely
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('time, status')
      .eq('counselor_id', counselorId)
      .eq('date', date)
      .neq('status', APPOINTMENT_STATUS.CANCELLED);

    if (error) {
      console.error('[booked-slots API] Error querying appointments:', error.message);
      return NextResponse.json({ bookedSlots: [], error: error.message }, { status: 500 });
    }

    const bookedSlots = (data || []).map((a: any) => a.time);

    return NextResponse.json({
      success: true,
      counselorId,
      date,
      bookedSlots,
    });
  } catch (err: any) {
    console.error('[booked-slots API] Unexpected error:', err);
    return NextResponse.json({ bookedSlots: [], error: err?.message }, { status: 500 });
  }
}
