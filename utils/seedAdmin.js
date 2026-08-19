import { Admin } from '../models/Admin.js';

/**
 * Auto-seed Super Admin account into MongoDB Atlas
 * Target Email: admin@mycityqueen.com
 * Target Password: Password@123 (hashed via bcrypt)
 */
export const autoSeedSuperAdmin = async () => {
  try {
    const targetEmail = 'admin@mycityqueen.com';
    const targetPassword = 'Password@123';

    let admin = await Admin.findOne({ email: targetEmail }).select('+password');

    if (!admin) {
      console.log(`🌱 Seeding Super Admin account (${targetEmail})...`);
      admin = await Admin.create({
        fullName: 'Super Admin',
        email: targetEmail,
        mobile: '+91 9999999999',
        password: targetPassword,
        role: 'super_admin',
        permissions: [
          'approve_ads',
          'edit_profiles',
          'verify_documents',
          'ban_users',
          'view_revenue',
          'system_settings',
        ],
        isVerified: true,
        isActive: true,
      });
      console.log(`✅ Super Admin account created successfully (${targetEmail}).`);
    } else {
      // Ensure password matches Password@123
      const isMatch = await admin.matchPassword(targetPassword);
      if (!isMatch) {
        console.log(`🔄 Updating Super Admin password for ${targetEmail}...`);
        admin.password = targetPassword;
        admin.isVerified = true;
        admin.isActive = true;
        await admin.save();
        console.log(`✅ Super Admin password updated successfully for ${targetEmail}.`);
      } else {
        console.log(`👤 Super Admin account verified (${targetEmail}).`);
      }
    }
  } catch (err) {
    console.error('❌ Super Admin seed error:', err.message);
  }
};
