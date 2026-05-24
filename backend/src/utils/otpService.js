const bcrypt = require('bcryptjs');

// Mock OTP service since we don't have Twilio/Firebase keys yet
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
};

const sendOTP = async (mobileNumber, otp) => {
  // In production, integrate Twilio or Firebase here
  console.log(`\n===========================================`);
  console.log(`[MOCK OTP SERVICE] Sending OTP: ${otp}`);
  console.log(`[MOCK OTP SERVICE] To Mobile: ${mobileNumber}`);
  console.log(`===========================================\n`);
  return true;
};

const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};

const verifyOTP = async (candidateOTP, hashedOTP) => {
  if (!hashedOTP) return false;
  return await bcrypt.compare(candidateOTP, hashedOTP);
};

module.exports = {
  generateOTP,
  sendOTP,
  hashOTP,
  verifyOTP
};
