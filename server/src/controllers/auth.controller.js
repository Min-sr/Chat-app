import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/user.model.js';
import { cacheSet, cacheDel } from '../config/redis.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send verification email
const sendVerificationEmail = async (toEmail, verifyLink) => {
  await transporter.sendMail({
    from: `"Chat App" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Xác thực tài khoản của bạn',
    html: `
      <h2>Xác thực email</h2>
      <p>Click vào link bên dưới để xác thực tài khoản:</p>
      <a href="${verifyLink}">${verifyLink}</a>
      <p>Link hết hạn sau 24 giờ.</p>
    `,
  });
};



// ================= REGISTER =================

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public

export const register = async (req, res) => {
  try {

    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      isVerified: false,
      verificationToken,
      verificationExpire: Date.now() + 24 * 60 * 60 * 1000
    });

    // Send verification email
    const verifyLink = `http://localhost/api/auth/verify/${verificationToken}`;
    await sendVerificationEmail(user.email, verifyLink);

    res.status(201).json({
      success: true,
      message: 'Register successful. Please verify your email.',
      data: { user }
    });

  } catch (error) {

    console.error('Register error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });

  }
};



// ================= VERIFY EMAIL =================

// @desc    Verify email
// @route   GET /api/auth/verify/:token
// @access  Public

export const verifyEmail = async (req, res) => {
  try {

    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalid or expired'
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;

    await user.save();

    // Redirect về trang login với thông báo verified
    res.redirect(`${process.env.CLIENT_URL}login?verified=true`);

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });

  }
};



// ================= LOGIN =================

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public

export const login = async (req, res) => {
  try {

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check email verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before login'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Cache user
    await cacheSet(`user:${user._id}`, user, 3600);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });

  } catch (error) {

    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });

  }
};



// ================= GET CURRENT USER =================

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private

export const getMe = async (req, res) => {
  try {

    const user = await User.findById(req.user.id)
      .populate('friends', 'username email avatar isOnline lastSeen')
      .populate('friendRequests.from', 'username email avatar');

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {

    console.error('Get me error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });

  }
};



// ================= UPDATE PROFILE =================

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private

export const updateProfile = async (req, res) => {
  try {

    const { username, bio, avatar } = req.body;

    const updateData = {};

    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Clear cache
    await cacheDel(`user:${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {

    console.error('Update profile error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });

  }
};