import nodemailer from 'nodemailer';

/**
 * Brevo Transactional Email Utility
 * Auto-detects Brevo REST API Key (xkeysib-...) and Brevo SMTP Key (xsmtpsib-...)
 */
export const sendEmail = async (options) => {
  const rawKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS || '';
  const senderEmail = process.env.FROM_EMAIL || 'ayushdigitech063@gmail.com';
  const senderName = process.env.FROM_NAME || 'Skokka Security';

  // 1. Primary: Brevo REST API v3 (Used when BREVO_API_KEY starts with xkeysib-)
  if (rawKey.startsWith('xkeysib-')) {
    console.log(`[EMAIL] Sending via Brevo REST API (xkeysib) to ${options.email}...`);
    const payload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: options.email }],
      subject: options.subject,
      textContent: options.message,
      htmlContent: options.html || `<p>${options.message}</p>`,
    };

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': rawKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.message || `HTTP ${response.status} ${response.statusText}`;
        console.error(`[EMAIL] ❌ Brevo REST API failed: ${errorMsg}`);
        throw new Error(`Brevo API Error: ${errorMsg}`);
      }

      console.log(`[EMAIL] ✅ Brevo REST API email sent successfully. Message ID: ${data.messageId || 'sent'}`);
      return true;
    } catch (error) {
      console.error(`[EMAIL] ⚠️ Brevo REST API error: ${error.message}. Attempting SMTP fallback...`);
    }
  }

  // 2. Secondary: Brevo SMTP (Used when key is xsmtpsib-... or SMTP credentials provided)
  try {
    const smtpUser = process.env.SMTP_USER || (rawKey.startsWith('xsmtpsib-') ? 'b5fbdf001@smtp-brevo.com' : senderEmail);
    const smtpPass = rawKey || process.env.SMTP_PASS;

    console.log(`[EMAIL] Sending via Brevo SMTP (${smtpUser}) to ${options.email}...`);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: smtpPass
        ? {
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || `<p>${options.message}</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Brevo SMTP email sent successfully. Message ID: ${info.messageId}`);
    return true;
  } catch (smtpErr) {
    console.error(`[EMAIL] ❌ Brevo SMTP failed: ${smtpErr.message}`);
    return false;
  }
};
