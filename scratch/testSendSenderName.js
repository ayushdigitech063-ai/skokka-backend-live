import dotenv from 'dotenv';
dotenv.config();

import { sendEmail } from '../utils/sendEmail.js';

async function testSenderName() {
  console.log("Sending test email to verify sender name...");
  await sendEmail({
    email: 'ayushdigitech063@gmail.com',
    subject: '🔐 Your Password Reset Verification Code - MyCityQueen',
    message: 'Your OTP code is: 817772',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #050B1F; color: #ffffff; border-radius: 16px;">
        <h2 style="color: #d5639b; margin-bottom: 5px;">MYCITYQUEEN CLASSIFIEDS</h2>
        <p style="color: #94a3b8; font-size: 14px;">Password Reset Verification Code</p>
        <div style="text-align: center; margin: 20px 0; font-size: 28px; font-weight: bold; color: #d5639b;">817772</div>
      </div>
    `,
  });
  console.log("✅ Email sent successfully! Check inbox for 'MyCityQueen Enterprise Security'.");
}

testSenderName().catch((err) => console.error("❌ Test failed:", err));
