const User = require('../models/User');
const logActivity = require('../utils/activityLogger');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    await sendTokenResponse(user, 201, res);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email and password' });
    }

    // Check for user (Case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Log the login event to audit trail
    await logActivity({
      title: 'User Login',
      desc: `${user.name} (${user.role}) signed in to the workspace`,
      type: 'system',
      user: user._id,
      userName: user.name,
      color: 'bg-secondary'
    });

    await sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = async (user, statusCode, res) => {
  // Create tokens
  const token = user.getSignedJwtToken(); // Access Token (15m)
  const refreshToken = user.getRefreshToken(); // Refresh Token (7d)

  // Save refresh token to user (optional, depending on strict revocation needs, but let's save it to match schema)
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' // Better for cross-port development
  };

  res
    .status(statusCode)
    .cookie('refreshToken', refreshToken, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
};

// @desc    Refresh Access Token
// @route   POST /api/v1/auth/refresh
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Not authorized to refresh token' });
    }

    // Verify token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');

    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
       return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token refresh failed' });
  }
};
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    user.password = req.body.newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
  }
};

// @route   POST /api/v1/auth/forgotpassword-session
// @access  Private
exports.sendPasswordResetOtp = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();
    
    const emailService = require('../services/emailService');
    await emailService.sendEmail({
      to: user.email,
      subject: 'DworkZ - Password Reset OTP',
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Use the following OTP to proceed:</p>
        <h1 style="color: #14b8a6; letter-spacing: 2px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>`,
      type: 'security'
    });
    
    res.status(200).json({ success: true, message: 'OTP sent to your registered email.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route   POST /api/v1/auth/resetpassword-session
// @access  Private
exports.resetPasswordWithOtp = async (req, res, next) => {
  try {
    const { otp, newPassword } = req.body;
    
    if (!otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Please provide both OTP and new password.' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findOne({ 
      _id: req.user.id, 
      resetOtp: otp, 
      resetOtpExpire: { $gt: Date.now() } 
    }).select('+password +resetOtp +resetOtpExpire');

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP.' });
    }

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpire = undefined;
    await user.save();

    await logActivity({
      title: 'Password Reset',
      desc: `${user.name} reset their password using OTP verification`,
      type: 'security',
      user: user._id,
      userName: user.name,
      color: 'bg-red-500'
    });

    res.status(200).json({ success: true, message: 'Password reset successful.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
