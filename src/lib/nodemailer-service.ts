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
}

/**
 * Creates an open-source nodemailer transporter.
 * Supports SMTP (Host/Port/User/Pass), Gmail, or Ethereal test account fallback.
 */
async function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Fallback: Generate open-source Ethereal test SMTP account for testing
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

/**
 * Sends a confirmation email to the student with only the confirmed date, time, and session details.
 */
export async function sendConfirmationEmailViaNodemailer(data: ConfirmationEmailData) {
  const transporter = await getTransporter();

  const formattedRef = data.appointmentId 
    ? `#USPF-GS-${data.appointmentId.slice(0, 8).toUpperCase()}` 
    : '';

  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || 'guidance@uspf.edu.ph';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Appointment Confirmed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #059669; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 28px; }
    .info-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .info-table tr { border-bottom: 1px solid #f1f5f9; }
    .info-table tr:last-child { border-bottom: none; }
    .info-table td { padding: 12px 0; font-size: 14px; }
    .label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 38%; }
    .value { color: #0f172a; font-weight: 700; text-align: right; }
    .highlight { color: #059669; font-size: 15px; }
    .footer { text-align: center; padding: 16px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Booking Confirmed</h1>
      <p>Your guidance consultation has been approved.</p>
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
    </div>
    <div class="footer">
      USPF Guidance & Counseling Center
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

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err: any) {
    console.error('[Nodemailer Error]:', err);
    if (
      err?.message?.includes('535') ||
      err?.message?.includes('BadCredentials') ||
      err?.message?.includes('Username and Password not accepted')
    ) {
      throw new Error(
        'Gmail SMTP Authentication Failed: Gmail requires a 16-character Google App Password (not your normal Gmail password). Please generate an App Password at https://myaccount.google.com/apppasswords and update SMTP_PASS in .env.'
      );
    }
    throw err;
  }
}
