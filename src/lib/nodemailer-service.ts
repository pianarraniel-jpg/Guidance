import nodemailer from 'nodemailer';

export interface ConfirmationEmailData {
  toEmail: string;
  studentName: string;
  counselorName: string;
  date: string;
  time: string;
  type: string;
  location: string;
  appointmentId: string;
  origin?: string;
}

/**
 * Resolves the canonical base URL for email action links.
 * Prioritizes:
 * 1. Request origin header (e.g. https://guidance-rho.vercel.app from incoming request)
 * 2. NEXT_PUBLIC_APP_URL environment variable
 * 3. VERCEL_URL environment variable
 * 4. Production fallback: https://guidance-rho.vercel.app
 */
export function getAppBaseUrl(origin?: string): string {
  if (origin && origin.startsWith('http')) {
    const cleanOrigin = origin.replace(/\/$/, '');
    if (!cleanOrigin.includes('localhost') || process.env.NODE_ENV !== 'production') {
      return cleanOrigin;
    }
  }

  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim()) {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '');
    if (process.env.NODE_ENV === 'production' && envUrl.includes('localhost')) {
      return 'https://guidance-rho.vercel.app';
    }
    return envUrl;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }

  return 'https://guidance-rho.vercel.app';
}

/**
 * Creates an open-source nodemailer transporter.
 * Supports Gmail directly via service: 'gmail' (with port 465 SSL) to prevent Vercel/Lambda port 587 STARTTLS freezes,
 * standard custom SMTP with configurable timeouts, or test fallback.
 */
async function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || 'guidancesync.confirm@gmail.com').trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'luxnixpiyzjoiuza').replace(/\s+/g, '');

  const isGmail = host === 'smtp.gmail.com' || user.toLowerCase().endsWith('@gmail.com');

  // For Gmail in serverless (e.g. Vercel / AWS Lambda):
  // Using service: 'gmail' uses direct TLS/SSL (port 465) without STARTTLS upgrade handshakes
  // which prevents connection timeouts and hanging on Vercel.
  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      pool: false,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // Standard Custom SMTP (e.g. SendGrid, Mailgun, AWS SES, or university mail relay)
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: false,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Sends an official consultation confirmation email to the student with clear schedule details
 * and a direct action button linking to https://guidance-rho.vercel.app.
 */
export async function sendConfirmationEmailViaNodemailer(data: ConfirmationEmailData) {
  const transporter = await getTransporter();

  const formattedRef = data.appointmentId 
    ? `#USPF-GS-${data.appointmentId.slice(0, 8).toUpperCase()}` 
    : '';

  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'guidancesync.confirm@gmail.com';
  const baseUrl = getAppBaseUrl(data.origin);
  const appointmentsUrl = `${baseUrl}/student/appointments`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consultation Confirmed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #059669; padding: 28px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.95; }
    .content { padding: 28px; }
    .info-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .info-table tr { border-bottom: 1px solid #f1f5f9; }
    .info-table tr:last-child { border-bottom: none; }
    .info-table td { padding: 12px 0; font-size: 14px; }
    .label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 38%; }
    .value { color: #0f172a; font-weight: 700; text-align: right; }
    .highlight { color: #059669; font-size: 15px; }
    .btn-container { text-align: center; margin: 28px 0 16px; }
    .btn { display: inline-block; background-color: #059669; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 28px; border-radius: 12px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2); }
    .direct-link { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 10px; word-break: break-all; }
    .footer { text-align: center; padding: 18px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Booking Confirmed</h1>
      <p>Your guidance consultation session has been approved.</p>
    </div>
    <div class="content">
      <table class="info-table">
        <tr>
          <td class="label">Student</td>
          <td class="value">${data.studentName}</td>
        </tr>
        <tr>
          <td class="label">Date</td>
          <td class="value highlight">${data.date}</td>
        </tr>
        <tr>
          <td class="label">Time</td>
          <td class="value highlight">${data.time}</td>
        </tr>
        <tr>
          <td class="label">Guidance Counselor</td>
          <td class="value">${data.counselorName}</td>
        </tr>
        <tr>
          <td class="label">Session Type</td>
          <td class="value">${data.type}</td>
        </tr>
        <tr>
          <td class="label">Location / Mode</td>
          <td class="value">${data.location}</td>
        </tr>
        ${formattedRef ? `
        <tr>
          <td class="label">Reference ID</td>
          <td class="value" style="font-family: monospace;">${formattedRef}</td>
        </tr>
        ` : ''}
      </table>

      <div class="btn-container">
        <a href="${appointmentsUrl}" class="btn">
          View Your Appointment
        </a>
      </div>
      <p class="direct-link">
        Direct portal link: <a href="${appointmentsUrl}" style="color: #059669;">${appointmentsUrl}</a>
      </p>
    </div>
    <div class="footer">
      USPF Guidance & Counseling Center • GuidanceSync Campus Wellness
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
BOOKING CONFIRMED

Student: ${data.studentName}
Date: ${data.date}
Time: ${data.time}
Guidance Counselor: ${data.counselorName}
Session Type: ${data.type}
Location / Mode: ${data.location}
${formattedRef ? `Reference ID: ${formattedRef}` : ''}

View appointment in GuidanceSync: ${appointmentsUrl}
  `.trim();

  const mailOptions = {
    from: `"USPF Guidance Center" <${fromEmail}>`,
    to: data.toEmail,
    subject: `Booking Confirmed: ${data.date} at ${data.time}`,
    text: textContent,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Nodemailer] Confirmation email sent to:', data.toEmail, 'MessageId:', info.messageId);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('[Nodemailer] Test Preview URL:', previewUrl);
    }

    return { success: true, messageId: info.messageId, previewUrl, link: appointmentsUrl };
  } catch (err: any) {
    console.error('[Nodemailer Error]:', err);
    if (
      err?.message?.includes('535') ||
      err?.message?.includes('BadCredentials') ||
      err?.message?.includes('Username and Password not accepted')
    ) {
      throw new Error(
        'Gmail SMTP Authentication Failed: Gmail requires a 16-character Google App Password. Please check SMTP_PASS.'
      );
    }
    throw err;
  }
}

