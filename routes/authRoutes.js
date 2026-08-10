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

// User Registration Route (Checks duplicate email)
router.post('/user-register', async (req, res) => {
  try {
    const { email, password } = req.body;
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
      isActivated: false,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Activation email sent.',
      user: { id: newUser._id, email: newUser.email, customerCode: newUser.customerCode },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// User Login Route
router.post('/user-login', async (req, res) => {
  try {
    const { email, password } = req.body;
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

    // Require activation via email link before allowing login
    if (!user.isActivated) {
      return res.status(403).json({
        success: false,
        message: 'Account not activated yet. Please check your email inbox and click the activation link before logging in.',
        isActivated: false,
      });
    }

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
