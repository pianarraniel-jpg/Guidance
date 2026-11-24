import { isBookedByCounselor } from './appointment-utils';

export interface BookingNotificationPayload {
  id: string;
  studentId: string;
  studentName: string;
  counselorId?: string;
  counselorName?: string;
  date: string;
  time: string;
  type: string;
  status: string;
  location: string;
  reason: string;
  createdAt: string;
  updatedAt?: string | number;
}

export interface AppNotificationPayload {
  id: string;
  type: 'appointment';
  title: string;
  description: string;
  timestamp: number;
  link: string;
  studentName: string;
  isRead: boolean;
}

export function formatCounselorDisplayName(name?: string): string {
  if (!name || !name.trim()) return 'Guidance Counselor';
  const clean = name.trim();
  // Strip department suffixes like "(CBA, CCS, CJEA)"
  const withoutDept = clean.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return withoutDept || 'Guidance Counselor';
}

export function buildBookingEmailPayload(
  appointment: BookingNotificationPayload,
): BookingNotificationPayload {
  return { ...appointment };
}

export function buildCounselorBookingBellPayload(
  appointment: BookingNotificationPayload,
  isRead: boolean,
  timestampOverride?: number,
): AppNotificationPayload {
  const student = appointment.studentName || 'Student';
  const timeStr = appointment.time ? ` at ${appointment.time}` : '';
  const dateStr = appointment.date || 'the scheduled date';
  const status = (appointment.status || 'pending').toLowerCase();

  let title = 'Session Update';
  let description = `Session with ${student} for ${dateStr}${timeStr} has been updated.`;
  const bookedByCounselor = isBookedByCounselor(appointment);

  if (status === 'confirmed') {
    title = bookedByCounselor ? 'Session Confirmed by Student' : 'Session Confirmed';
    description = bookedByCounselor
      ? `${student} confirmed the session scheduled for ${dateStr}${timeStr}.`
      : `Session with ${student} on ${dateStr}${timeStr} is confirmed.`;
  } else if (status === 'cancelled') {
    title = 'Session Cancelled';
    description = `${student} cancelled the session for ${dateStr}${timeStr}.`;
  } else if (status === 'pending') {
    title = bookedByCounselor ? 'Session Invitation Sent' : 'New Booking Request';
    description = bookedByCounselor
      ? `Invitation sent to ${student} for ${dateStr}${timeStr} (Awaiting student confirmation).`
      : `${student} requested a session for ${dateStr}${timeStr}.`;
  } else if (status === 'completed') {
    title = 'Session Completed';
    description = `Session with ${student} on ${dateStr}${timeStr} was completed.`;
  }

  const rawTs = appointment.updatedAt || appointment.createdAt;
  const parsedTs = rawTs ? new Date(rawTs).getTime() : Date.now();
  const ts = timestampOverride || (isNaN(parsedTs) ? Date.now() : parsedTs);

  return {
    id: `apt-counselor-${appointment.id}-${appointment.status || 'pending'}-${appointment.date || ''}-${appointment.time || ''}`,
    type: 'appointment',
    title,
    description,
    timestamp: ts,
    link: '/counselor/appointments',
    studentName: student,
    isRead,
  };
}

export function buildStudentAppointmentBellPayload(
  appointment: BookingNotificationPayload,
  isRead: boolean,
  timestampOverride?: number,
): AppNotificationPayload {
  const counselor = formatCounselorDisplayName(appointment.counselorName);
  const isConfirmed = appointment.status === 'confirmed';
  const isCancelled = appointment.status === 'cancelled';
  const isPending = appointment.status === 'pending';
  const bookedByCounselor = isBookedByCounselor(appointment);
  const timeStr = appointment.time ? ` at ${appointment.time}` : '';
  const dateStr = appointment.date || 'your scheduled date';

  let title = 'Session Update';
  let description = `Your session with ${counselor} for ${dateStr}${timeStr} has been updated.`;

  if (isConfirmed) {
    title = 'Session Confirmed';
    description = `Your session with ${counselor} on ${dateStr}${timeStr} is confirmed.`;
  } else if (isCancelled) {
    title = 'Session Cancelled';
    description = `Your session with ${counselor} on ${dateStr}${timeStr} has been cancelled.`;
  } else if (isPending) {
    title = bookedByCounselor ? 'Session Confirmation Required' : 'Consultation Scheduled';
    description = bookedByCounselor
      ? `${counselor} scheduled a session for ${dateStr}${timeStr}. Please confirm your attendance.`
      : `A session with ${counselor} is scheduled for ${dateStr}${timeStr}.`;
  }

  const ts = timestampOverride || (appointment.createdAt ? new Date(appointment.createdAt).getTime() : Date.now());

  return {
    id: `apt-status-${appointment.id}-${appointment.status}-${appointment.date || ''}-${appointment.time || ''}`,
    type: 'appointment',
    title,
    description,
    timestamp: ts,
    link: '/student/appointments',
    studentName: 'You',
    isRead,
  };
}
