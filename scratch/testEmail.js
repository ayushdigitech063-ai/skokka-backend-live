import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    val = val.replace(/^["']|["']$/g, '');
    envVars[key] = val;
  }
});

console.log("Testing Email Account:", envVars.EMAIL_USER);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: envVars.EMAIL_USER,
    pass: envVars.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Gmail Connection Failed:", error.message);
    process.exit(1);
  } else {
    console.log("✅ SUCCESS: Gmail SMTP credentials are 100% WORKING!");
    process.exit(0);
  }
});
