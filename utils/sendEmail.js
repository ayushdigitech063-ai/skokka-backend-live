import nodemailer from 'nodemailer';
import dns from 'node:dns';

// Force Node.js DNS resolution to prioritize IPv4 address resolution globally
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  // Ignore if unsupported in environment
}

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

  console.log(`📧 [SMTP Init] Host: ${smtpHost} | Port: ${smtpPort} | Secure: ${smtpPort === 465} | IP Version: IPv4 (family: 4)`);

  // Create reusable transporter object with explicit IPv4 preference & strict timeouts
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for 587
    family: 4,                // Explicitly force IPv4 to prevent ENETUNREACH on Render
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
    console.log(`📧 [SMTP Success] Email sent to ${options.email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`📧 [SMTP Failure] Failed to send email to ${options.email} | Code: ${error.code || 'UNKNOWN'} | Error: ${error.message}`);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};
