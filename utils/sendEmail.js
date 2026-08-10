/**
 * Brevo Transactional Email Utility
 * Replaces Gmail SMTP with Brevo Transactional Email REST API v3
 */
export const sendEmail = async (options) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.FROM_EMAIL || 'ayushdigitech49@gmail.com';
  const senderName = process.env.FROM_NAME || 'Skokka Security';

  if (!apiKey) {
    const missingErr = 'BREVO_API_KEY environment variable is not configured on Render.';
    console.error(`[EMAIL] ❌ Brevo delivery failed: ${missingErr}`);
    throw new Error(missingErr);
  }

  console.log(`[EMAIL] Sending via Brevo REST API to ${options.email}...`);

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [
      {
        email: options.email,
      },
    ],
    subject: options.subject,
    textContent: options.message,
    htmlContent: options.html || `<p>${options.message}</p>`,
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.message || `HTTP ${response.status} ${response.statusText}`;
      console.error(`[EMAIL] ❌ Brevo delivery failed: ${errorMsg}`);
      throw new Error(`Brevo API Error: ${errorMsg}`);
    }

    console.log(`[EMAIL] ✅ Brevo email sent successfully. Message ID: ${data.messageId || 'sent'}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] ❌ Brevo delivery failed: ${error.message}`);
    throw new Error(`Brevo Email delivery failed: ${error.message}`);
  }
};

