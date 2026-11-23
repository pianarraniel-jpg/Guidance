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

export function buildBookingEmailPayload(
  appointment: BookingNotificationPayload,
): BookingNotificationPayload {
  return { ...appointment };
}

export function buildCounselorBookingBellPayload(
  appointment: BookingNotificationPayload,
  isRead: boolean,
): AppNotificationPayload {
  return {
    id: `apt-${appointment.id}`,
    type: 'appointment',
    title: 'New Booking Request',
    description: `${appointment.studentName} requested a session for ${appointment.date}`,
    timestamp: new Date(appointment.createdAt || Date.now()).getTime(),
    link: '/counselor/appointments',
    studentName: appointment.studentName,
    isRead,
  };
}

export function buildStudentAppointmentBellPayload(
  appointment: BookingNotificationPayload,
  isRead: boolean,
): AppNotificationPayload {
  const isConfirmed = appointment.status === 'confirmed';
  return {
    id: `apt-status-${appointment.id}-${appointment.status}`,
    type: 'appointment',
    title: isConfirmed ? 'Session Confirmed' : 'Session Cancelled',
    description: `Your session with Dr. ${appointment.counselorName?.split(' ').pop()} for ${appointment.date} is ${appointment.status}.`,
    timestamp: new Date(appointment.createdAt || Date.now()).getTime(),
    link: '/student/appointments',
    studentName: 'You',
    isRead,
  };
}
