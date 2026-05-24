const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateOTP, sendOTP, hashOTP, verifyOTP } = require('../utils/otpService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, storeName, mobileNumber, faceEmbedding } = req.body;

    if (!name || !email || !password || !mobileNumber) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and mobile number are required.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ 
      name, 
      email, 
      password, 
      storeName: storeName || 'My Store',
      mobileNumber,
      faceEmbedding: faceEmbedding || []
    });
    
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        storeName: user.storeName,
        mobileNumber: user.mobileNumber,
        hasFaceRegistered: user.faceEmbedding && user.faceEmbedding.length > 0,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        storeName: user.storeName,
        mobileNumber: user.mobileNumber,
        hasFaceRegistered: user.faceEmbedding && user.faceEmbedding.length > 0,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar,
      storeName: req.user.storeName,
      mobileNumber: req.user.mobileNumber,
      hasFaceRegistered: req.user.faceEmbedding && req.user.faceEmbedding.length > 0,
      createdAt: req.user.createdAt,
    },
  });
};

// @desc    Update current user profile
// @route   PUT /api/auth/me
const updateMe = async (req, res) => {
  try {
    const allowed = ['name', 'storeName', 'avatar', 'mobileNumber'];
    const updates = {};

    allowed.forEach((field) => {
      if (typeof req.body[field] === 'string') updates[field] = req.body[field].trim();
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        storeName: user.storeName,
        mobileNumber: user.mobileNumber,
        hasFaceRegistered: user.faceEmbedding && user.faceEmbedding.length > 0,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating profile.' });
  }
};

// --- Face Management ---
const saveFaceEmbedding = async (req, res) => {
  try {
    const { faceEmbedding } = req.body;
    if (!faceEmbedding || !Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid face embedding.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { faceEmbedding },
      { new: true }
    );

    res.json({ success: true, message: 'Face registered successfully.', hasFaceRegistered: true });
  } catch (error) {
    console.error('Save face error:', error);
    res.status(500).json({ success: false, message: 'Server error saving face.' });
  }
};

const removeFaceEmbedding = async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      { faceEmbedding: [] },
      { new: true }
    );
    res.json({ success: true, message: 'Face removed successfully.', hasFaceRegistered: false });
  } catch (error) {
    console.error('Remove face error:', error);
    res.status(500).json({ success: false, message: 'Server error removing face.' });
  }
};

const getFaceEmbedding = async (req, res) => {
  // Only return embedding for the authenticated user to verify client side
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, faceEmbedding: user.faceEmbedding || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error getting face embedding.' });
  }
};

// --- OTP & MFA ---
const sendUserOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.mobileNumber) {
      return res.status(400).json({ success: false, message: 'No mobile number registered.' });
    }

    // Check lockout
    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      return res.status(429).json({ success: false, message: 'Account temporarily locked due to too many failed attempts.' });
    }

    const otp = generateOTP();
    const hashed = await hashOTP(otp);

    user.otpHash = hashed;
    user.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 mins
    await user.save();

    await sendOTP(user.mobileNumber, otp);

    res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error sending OTP.' });
  }
};

const verifyUserOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id);

    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      return res.status(429).json({ success: false, message: 'Account locked.' });
    }

    if (!user.otpHash || !user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired or not requested.' });
    }

    const isValid = await verifyOTP(otp, user.otpHash);
    if (!isValid) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= 5) {
        user.lockoutUntil = Date.now() + 15 * 60 * 1000; // lock for 15 mins
      }
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    // Success
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    user.failedAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();

    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying OTP.' });
  }
};

const verifyUserPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      return res.status(429).json({ success: false, message: 'Account locked.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= 5) {
        user.lockoutUntil = Date.now() + 15 * 60 * 1000;
      }
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid password.' });
    }

    user.failedAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();

    res.json({ success: true, message: 'Password verified successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error verifying password.' });
  }
};

module.exports = { 
  register, 
  login, 
  getMe, 
  updateMe,
  saveFaceEmbedding,
  removeFaceEmbedding,
  getFaceEmbedding,
  sendUserOTP,
  verifyUserOTP,
  verifyUserPassword
};
