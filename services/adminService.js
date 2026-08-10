import { Admin } from '../models/Admin.js';
import { generateOTP } from '../utils/generateOTP.js';
import { sendEmail } from '../utils/sendEmail.js';

export const createAdminService = async (adminData, creatorId) => {
  const { fullName, email, mobile, password, permissions, role } = adminData;

  const existingEmail = await Admin.findOne({ email });
  if (existingEmail) {
    throw new Error('An admin with this email address already exists.');
  }

  const admin = await Admin.create({
    fullName,
    email,
    mobile,
    password,
    role: role || 'admin',
    permissions: permissions || ['approve_ads', 'edit_profiles'],
    createdBy: creatorId,
  });

  return admin;
};

export const getAllAdminsService = async () => {
  return await Admin.find().select('-password').sort('-createdAt');
};

export const getAdminByIdService = async (id) => {
  const admin = await Admin.findById(id).select('-password');
  if (!admin) {
    throw new Error('Admin not found');
  }
  return admin;
};

export const updateAdminService = async (id, updateData) => {
  const admin = await Admin.findById(id);
  if (!admin) {
    throw new Error('Admin not found');
  }

  if (updateData.fullName) admin.fullName = updateData.fullName;
  if (updateData.mobile) admin.mobile = updateData.mobile;
  if (updateData.permissions) admin.permissions = updateData.permissions;
  if (updateData.password) admin.password = updateData.password;

  await admin.save();
  return admin;
};

export const deleteAdminService = async (id) => {
  const admin = await Admin.findById(id);
  if (!admin) {
    throw new Error('Admin not found');
  }
  if (admin.role === 'super_admin') {
    throw new Error('Root Super Admin cannot be deleted.');
  }
  await admin.deleteOne();
  return true;
};

export const toggleAdminStatusService = async (id) => {
  const admin = await Admin.findById(id);
  if (!admin) {
    throw new Error('Admin not found');
  }
  if (admin.role === 'super_admin') {
    throw new Error('Cannot disable Root Super Admin.');
  }
  admin.isActive = !admin.isActive;
  await admin.save();
  return admin;
};

export const sendOtpService = async (admin) => {
  const otp = generateOTP();
  const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  admin.otp = otp;
  admin.otpExpire = otpExpire;
  await admin.save();

  const message = `Your 6-Digit Skokka Admin Verification OTP is: ${otp}. This code is valid for 10 minutes.`;
  await sendEmail({
    email: admin.email,
    subject: 'Skokka Admin First-Login OTP Verification',
    message,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #050B1F; color: #ffffff; border-radius: 12px;">
        <h2 style="color: #f43f5e;">Skokka Admin Portal Security</h2>
        <p>Hello <strong>${admin.fullName}</strong>,</p>
        <p>Your 6-Digit Verification OTP for first-time login is:</p>
        <div style="font-size: 28px; font-weight: bold; color: #10b981; letter-spacing: 4px; padding: 15px; background: #0B1437; border-radius: 8px; text-align: center; margin: 15px 0;">
          ${otp}
        </div>
        <p style="color: #94a3b8; font-size: 12px;">Valid for 10 minutes. Do not share this OTP with anyone.</p>
      </div>
    `,
  });

  return otp;
};
