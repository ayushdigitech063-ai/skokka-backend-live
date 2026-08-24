/**
 * Google reCAPTCHA v2 Checkbox Token Verification Utility
 * Verifies captchaToken response with https://www.google.com/recaptcha/api/siteverify
 * Secret Key is read strictly from process.env.RECAPTCHA_SECRET_KEY.
 */
export const verifyRecaptchaToken = async (captchaToken, remoteIp) => {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

  if (!captchaToken) {
    console.warn('[RECAPTCHA] ❌ Verification failed: No CAPTCHA token provided.');
    return {
      success: false,
      message: 'Please complete the CAPTCHA verification.',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', captchaToken);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!data.success) {
      console.warn('[RECAPTCHA] ❌ Token verification failed.');
      return {
        success: false,
        message: 'Please complete the CAPTCHA verification.',
      };
    }

    console.log('[RECAPTCHA] ✅ Verification passed successfully.');
    return { success: true };
  } catch (error) {
    console.error('[RECAPTCHA] 💥 Exception during Google siteverify API call:', error.message);
    return {
      success: false,
      message: 'Please complete the CAPTCHA verification.',
    };
  }
};
