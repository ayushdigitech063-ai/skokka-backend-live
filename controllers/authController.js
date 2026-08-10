import { Admin } from '../models/Admin.js';
import { generateToken, generateRefreshToken } from '../utils/generateToken.js';
import { sendOtpService } from '../services/adminService.js';

// @desc    Admin / Super Admin Login
// @route   POST /api/auth/login
// @access  Public
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select('+password +otp +otpExpire');
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account disabled. Please contact Root Super Admin.',
      });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    // FIRST LOGIN OTP VERIFICATION FLOW
    if (!admin.isVerified) {
      await sendOtpService(admin);

      return res.status(200).json({
        success: true,
        requiresOTP: true,
        message: 'First-time login detected. 6-digit OTP sent to registered email.',
        email: admin.email,
      });
    }

    // SUBSEQUENT LOGIN FLOW (Direct JWT)
    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      requiresOTP: false,
      token,
      refreshToken,
      user: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        mobile: admin.mobile,
        role: admin.role,
        permissions: admin.permissions,
        isVerified: admin.isVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login.',
    });
  }
};

// @desc    Verify First-Time Login OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const admin = await Admin.findOne({ email }).select('+otp +otpExpire');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    if (admin.otp !== otp || new Date() > admin.otpExpire) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired 6-digit OTP code.',
      });
    }

    admin.isVerified = true;
    admin.otp = undefined;
    admin.otpExpire = undefined;
    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. Admin account is now active!',
      token,
      refreshToken,
      user: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        mobile: admin.mobile,
        role: admin.role,
        permissions: admin.permissions,
        isVerified: admin.isVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Current Logged-in Admin Profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    return res.status(200).json({
      success: true,
      user: admin,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Logout Admin
// @route   POST /api/auth/logout
// @access  Private
export const logoutAdmin = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};
