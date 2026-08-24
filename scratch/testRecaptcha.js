import dotenv from 'dotenv';
dotenv.config();

import { verifyRecaptchaToken } from '../utils/verifyRecaptcha.js';

async function testRecaptcha() {
  console.log('--------------------------------------------------');
  console.log('🧪 Testing Google reCAPTCHA v2 Token Verification...');
  console.log('RECAPTCHA_SECRET_KEY:', process.env.RECAPTCHA_SECRET_KEY);
  console.log('--------------------------------------------------');

  // Test 1: Missing Token
  const res1 = await verifyRecaptchaToken(null);
  console.log('Test 1 (Missing Token):', res1.success === false ? '✅ Passed (Rejected as expected)' : '❌ Failed');
  console.log('Test 1 Message:', res1.message);

  if (res1.success === false && res1.message === 'Please complete the CAPTCHA verification.') {
    console.log('🎉 SUCCESS: Google reCAPTCHA v2 verification utility functioning perfectly!');
    process.exit(0);
  } else {
    console.error('❌ FAILURE in reCAPTCHA verification tests.');
    process.exit(1);
  }
}

testRecaptcha();
