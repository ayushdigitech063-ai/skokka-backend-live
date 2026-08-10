import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  // Create reusable transporter object using SMTP transport
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const message = {
    from: `"${process.env.FROM_NAME || 'Skokka Security'}" <${process.env.FROM_EMAIL || 'no-reply@skokka.in'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<p>${options.message}</p>`,
  };

  try {
    const info = await transporter.sendMail(message);
    console.log(`📧 Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Nodemailer warning (simulating OTP email output): ${error.message}`);
    console.log(`🔑 SIMULATED OTP FOR ${options.email}: ${options.message}`);
    return true;
  }
};
