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
  const ts = timestampOverride || (appointment.createdAt ? new Date(appointment.createdAt).getTime() : Date.now());
  return {
    id: `apt-${appointment.id}-${appointment.status || 'pending'}`,
    type: 'appointment',
    title: appointment.status === 'cancelled' ? 'Appointment Cancelled' : 'New Booking Request',
    description: appointment.status === 'cancelled'
      ? `${appointment.studentName || 'Student'} cancelled their session for ${appointment.date} at ${appointment.time}.`
      : `${appointment.studentName || 'A student'} requested a session for ${appointment.date} at ${appointment.time}.`,
    timestamp: ts,
    link: '/counselor/appointments',
    studentName: appointment.studentName || 'Student',
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
  } else if (appointment.status === 'pending') {
    title = 'Consultation Scheduled';
    description = `A session with ${counselor} is scheduled for ${dateStr}${timeStr}.`;
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
