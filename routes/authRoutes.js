import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  loginAdmin,
  verifyOTP,
  getMe,
  logoutAdmin,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware to handle Express-Validator errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({ field: err.param, message: err.msg })),
    });
  }
  next();
};

// Login Route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  loginAdmin
);

// Verify First-Login OTP Route
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate,
  verifyOTP
);

import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';
import { verifyRecaptchaToken } from '../utils/verifyRecaptcha.js';

// Helper to trigger email send asynchronously without blocking HTTP response
const dispatchActivationEmailAsync = (email) => {
  const appBaseUrl =
    process.env.CLIENT_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://skokka-website-frontend.vercel.app';
  const activationUrl = `${appBaseUrl}/dashboard?verify_login=true&email=${encodeURIComponent(email)}`;

  sendEmail({
    email,
    subject: '🚀 Activate Your Skokka Classifieds Account',
    message: `Click here to activate your account: ${activationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #050B1F; color: #ffffff; border-radius: 16px;">
        <h2 style="color: #d5639b; margin-bottom: 5px;">SKOKKA CLASSIFIEDS PORTAL</h2>
        <p style="color: #94a3b8; font-size: 14px;">Account Activation & Verification Request</p>
        <hr style="border-color: #1e293b; margin: 20px 0;" />
        <p>Hello <strong>${email.split('@')[0]}</strong>,</p>
        <p>Thank you for registering on Skokka India. Please click the button below to complete your activation:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activationUrl}" style="background: #d5639b; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 30px; display: inline-block;">
            🚀 ACTIVATE ACCOUNT & ACCESS DASHBOARD
          </a>
        </div>
      </div>
    `,
  }).catch((err) => {
    console.error(`⚠️ Background activation email dispatch error for ${email}:`, err.message);
  });
};

// User Registration Route (Checks duplicate email & sends non-blocking activation email)
router.post('/user-register', async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    // Verify Google reCAPTCHA v2 token
    const captchaResult = await verifyRecaptchaToken(captchaToken, req.ip);
    if (!captchaResult.success) {
      return res.status(400).json({ success: false, message: captchaResult.message });
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This email address is already registered. Please login instead or use a different email.',
      });
    }

    const newUser = await User.create({
      email: cleanEmail,
      password,
      isActivated: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: { id: newUser._id, email: newUser.email, customerCode: newUser.customerCode },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Resend Activation Email Route
router.post('/resend-activation', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    if (user.isActivated) {
      return res.status(400).json({ success: false, message: 'Account is already activated. Please log in.' });
    }

    dispatchActivationEmailAsync(cleanEmail);

    return res.status(200).json({
      success: true,
      message: 'Activation link resent successfully! Please check your email inbox.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// User Login Route
router.post('/user-login', async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    // Verify Google reCAPTCHA v2 token
    const captchaResult = await verifyRecaptchaToken(captchaToken, req.ip);
    if (!captchaResult.success) {
      return res.status(400).json({ success: false, message: captchaResult.message });
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email. Please sign up first.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.',
      });
    }

    // Email activation check removed - captcha is used instead
    /*
    if (!user.isActivated) {
      return res.status(403).json({
        success: false,
        message: 'Account not activated yet. Please check your email inbox and click the activation link before logging in.',
        isActivated: false,
      });
    }
    */

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      user: { id: user._id, email: user.email, customerCode: user.customerCode, isActivated: user.isActivated },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Activate Account Route
router.post('/activate-account', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required for activation.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    user.isActivated = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account activated successfully!',
      user: { id: user._id, email: user.email, customerCode: user.customerCode, isActivated: true },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
