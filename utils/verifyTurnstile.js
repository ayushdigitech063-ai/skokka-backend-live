/**
 * Cloudflare Turnstile CAPTCHA Token Verification Utility
 * Verifies response tokens with Cloudflare siteverify endpoint.
 * Secret Key is read strictly from process.env.TURNSTILE_SECRET_KEY.
 */
export const verifyTurnstileToken = async (token, remoteIp) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

  if (!token) {
    console.warn('[TURNSTILE] ❌ Verification failed: No CAPTCHA token provided in request.');
    return {
      success: false,
      message: 'Security CAPTCHA verification failed: Please complete the CAPTCHA challenge.',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!data.success) {
      const errorCodes = Array.isArray(data['error-codes']) ? data['error-codes'].join(', ') : 'invalid-input-response';
      console.warn(`[TURNSTILE] ❌ Verification failed for token. Error codes: ${errorCodes}`);
      return {
        success: false,
        message: `Security CAPTCHA verification failed (${errorCodes}). Please try again.`,
      };
    }

    console.log(`[TURNSTILE] ✅ CAPTCHA verification passed successfully.`);
    return { success: true };
  } catch (error) {
    console.error('[TURNSTILE] 💥 Exception during Cloudflare siteverify API call:', error.message);
    return {
      success: false,
      message: 'Server error communicating with CAPTCHA verification service. Please try again.',
    };
  }
};
