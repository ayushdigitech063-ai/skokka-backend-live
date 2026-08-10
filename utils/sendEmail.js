import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    const missingErr = 'SMTP credentials (SMTP_USER / SMTP_PASS) are not configured in environment variables.';
    console.error(`📧 Email sending failed: ${missingErr}`);
    throw new Error(missingErr);
  }

  // Create reusable transporter object with strict timeouts
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for 587
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000, // 10s
    greetingTimeout: 10000,   // 10s
    socketTimeout: 15000,     // 15s
  });

  const message = {
    from: `"${process.env.FROM_NAME || 'Skokka Security'}" <${process.env.FROM_EMAIL || smtpUser}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<p>${options.message}</p>`,
  };

  try {
    const info = await transporter.sendMail(message);
    console.log(`📧 Real Nodemailer email sent successfully. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`📧 Email sending failed for ${options.email}: ${error.message}`);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};
