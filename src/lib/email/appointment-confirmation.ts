import 'server-only';

import type { BookingNotificationPayload } from '@/lib/booking-notifications';

interface ConfirmationRecipient {
  email: string;
  name: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function createAppointmentConfirmationHtml(
  booking: BookingNotificationPayload,
  recipient: ConfirmationRecipient,
): string {
  const dashboardUrl = `${(process.env.APP_PUBLIC_URL || '').replace(/\/$/, '')}/student/appointments`;

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#1e293b">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="padding:28px;background:#1d4ed8;color:#ffffff">
          <h1 style="margin:0;font-size:24px">Appointment Confirmation</h1>
          <p style="margin:8px 0 0;opacity:.9">Guidance Counseling</p>
        </td></tr>
        <tr><td style="padding:28px">
          <p>Hello ${escapeHtml(recipient.name)},</p>
          <p>Your counseling appointment has been <strong>${escapeHtml(booking.status)}</strong>.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#f8fafc;border-radius:12px">
            <tr><td style="padding:18px">
              <p style="margin:0 0 10px"><strong>Date:</strong> ${escapeHtml(booking.date)}</p>
              <p style="margin:0 0 10px"><strong>Time:</strong> ${escapeHtml(booking.time)}</p>
              <p style="margin:0 0 10px"><strong>Counselor:</strong> ${escapeHtml(booking.counselorName || 'Counseling Services')}</p>
              <p style="margin:0 0 10px"><strong>Session type:</strong> ${escapeHtml(booking.type)}</p>
              <p style="margin:0 0 10px"><strong>Location:</strong> ${escapeHtml(booking.location)}</p>
              ${booking.reason ? `<p style="margin:0"><strong>Reason:</strong> ${escapeHtml(booking.reason)}</p>` : ''}
            </td></tr>
          </table>
          ${dashboardUrl ? `<p><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:12px 18px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">View Appointment</a></p>` : ''}
          <p style="font-size:12px;color:#64748b;margin-top:24px">Appointment ID: ${escapeHtml(booking.id)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
