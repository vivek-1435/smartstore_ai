const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
  register, login, getMe, updateMe,
  saveFaceEmbedding, removeFaceEmbedding, getFaceEmbedding,
  sendUserOTP, verifyUserOTP, verifyUserPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // Generous limit for production
  skip: (req) => {
    // Skip rate limiting for local development or loopback IPs to prevent developer lockout
    return process.env.NODE_ENV !== 'production' || 
           req.ip === '127.0.0.1' || 
           req.ip === '::1' || 
           req.ip === '::ffff:127.0.0.1';
  },
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' || 
           req.ip === '127.0.0.1' || 
           req.ip === '::1' || 
           req.ip === '::ffff:127.0.0.1';
  },
  message: { success: false, message: 'Too many OTP requests. Please wait 15 minutes.' }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

// Face Auth
router.post('/face', protect, saveFaceEmbedding);
router.delete('/face', protect, removeFaceEmbedding);
router.get('/face', protect, getFaceEmbedding);

// OTP & Fallbacks
router.post('/send-otp', protect, otpLimiter, sendUserOTP);
router.post('/verify-otp', protect, authLimiter, verifyUserOTP);
router.post('/verify-password', protect, authLimiter, verifyUserPassword);

module.exports = router;
