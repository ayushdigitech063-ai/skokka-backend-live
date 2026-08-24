import dotenv from 'dotenv';
dotenv.config();

import { sendEmail } from '../utils/sendEmail.js';

async function testMail() {
  console.log('--------------------------------------------------');
  console.log('🧪 Testing Nodemailer Gmail SMTP Activation Email...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS configured:', Boolean(process.env.EMAIL_PASS));
  console.log('--------------------------------------------------');

  const testRecipient = 'ayushdigitech063@gmail.com';
  const activationUrl = 'https://skokka-website-frontend.vercel.app/dashboard?verify_login=true&email=' + encodeURIComponent(testRecipient);

  try {
    const success = await sendEmail({
      email: testRecipient,
      subject: '🚀 Activate Your Skokka Classifieds Account',
      message: `Click here to activate your account: ${activationUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #050B1F; color: #ffffff; border-radius: 16px;">
          <h2 style="color: #d5639b; margin-bottom: 5px;">SKOKKA CLASSIFIEDS PORTAL</h2>
          <p style="color: #94a3b8; font-size: 14px;">Account Activation & Verification Request</p>
          <hr style="border-color: #1e293b; margin: 20px 0;" />
          <p>Hello <strong>ayushdigitech063</strong>,</p>
          <p>Thank you for registering on Skokka India. Please click the button below to complete your activation:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activationUrl}" style="background: #d5639b; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 30px; display: inline-block;">
              🚀 ACTIVATE ACCOUNT & ACCESS DASHBOARD
            </a>
          </div>
        </div>
      `,
    });

    if (success) {
      console.log('🎉 SUCCESS: Test activation email delivered via Nodemailer Gmail SMTP!');
      process.exit(0);
    } else {
      console.error('❌ FAILURE: sendEmail returned false');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ FATAL ERROR during test email dispatch:', err.message);
    process.exit(1);
  }
}

testMail();
