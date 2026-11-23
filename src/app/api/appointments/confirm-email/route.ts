import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'EmailJS sends booking confirmations directly from the client.' },
    { status: 410 },
  );
}
