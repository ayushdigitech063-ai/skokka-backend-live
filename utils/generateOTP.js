export const generateOTP = () => {
  // Generate secure 6-digit numerical OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};
