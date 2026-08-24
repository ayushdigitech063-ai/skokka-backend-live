import dotenv from 'dotenv';
dotenv.config();

import { verifyTurnstileToken } from '../utils/verifyTurnstile.js';

async function testTurnstile() {
  console.log('--------------------------------------------------');
  console.log('🧪 Testing Cloudflare Turnstile Verification Utility...');
  console.log('TURNSTILE_SECRET_KEY:', process.env.TURNSTILE_SECRET_KEY);
  console.log('--------------------------------------------------');

  // Test 1: Missing Token
  const res1 = await verifyTurnstileToken(null);
  console.log('Test 1 (Missing Token):', res1.success === false ? '✅ Passed (Rejected as expected)' : '❌ Failed');

  // Test 2: Valid Test Token (Cloudflare test token 'XXXX.DUMMY.TOKEN.XXXX')
  const res2 = await verifyTurnstileToken('1x00000000000000000000AA');
  console.log('Test 2 (Always-Pass Test Sitekey Token):', res2);

  if (res1.success === false && res2.success === true) {
    console.log('🎉 SUCCESS: Turnstile verification utility functioning perfectly!');
    process.exit(0);
  } else {
    console.error('❌ FAILURE in Turnstile verification tests.');
    process.exit(1);
  }
}

testTurnstile();
