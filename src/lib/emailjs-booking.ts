import emailjs from '@emailjs/browser';
import type { BookingNotificationPayload } from '@/lib/booking-notifications';

export interface BookingEmailRecipient {
  email: string;
  name: string;
}

export const sendBookingConfirmationEmail = async (
  booking: BookingNotificationPayload,
  recipient: BookingEmailRecipient,
): Promise<void> => {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('EmailJS configuration is missing');
  }

  await emailjs.send(
    serviceId,
    templateId,
    {
      to_email: recipient.email,
      to_name: recipient.name,
      student_name: booking.studentName,
      counselor_name: booking.counselorName || 'Counseling Services',
      appointment_id: booking.id,
      appointment_date: booking.date,
      appointment_time: booking.time,
      session_type: booking.type,
      appointment_status: booking.status,
      location: booking.location,
      reason: booking.reason || 'No reason provided',
      created_at: booking.createdAt,
      dashboard_url: `${(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')}/student/appointments`,
      subject: `Counseling appointment — ${booking.date} at ${booking.time}`,
    },
    { publicKey },
  );
};
