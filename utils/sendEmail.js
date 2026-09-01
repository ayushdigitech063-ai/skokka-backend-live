import nodemailer from 'nodemailer';

/**
 * Nodemailer Gmail SMTP Email Service
 * Uses host: smtp.gmail.com, port: 465, secure: true
 * Authenticates using process.env.EMAIL_USER & process.env.EMAIL_PASS
 */
export const sendEmail = async (options) => {
  const emailUser = process.env.EMAIL_USER || 'ayushdigitech063@gmail.com';
  const emailPass = process.env.EMAIL_PASS || 'jwbs pgcx uluj clwl';
  const senderEmail = process.env.FROM_EMAIL || emailUser;
  const senderName = process.env.FROM_NAME || 'Skokka Enterprise Security';

  console.log(`[EMAIL] 📧 Dispatching activation email via Gmail SMTP to ${options.email}...`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<p>${options.message}</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Gmail SMTP email dispatched successfully. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] ❌ Gmail SMTP Delivery Failure to ${options.email}:`, error.message);
    throw new Error(`Gmail SMTP delivery failed: ${error.message}`);
  }
};
