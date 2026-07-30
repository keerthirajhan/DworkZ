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
    // Lax cookies are never sent on cross-site XHR/fetch requests (only top-level navigations).
    // Since the frontend (app.thedworkz.com) and backend (onrender.com) are on different domains,
    // every API call is cross-site — so this MUST be 'none' in production, paired with secure:true,
    // or the browser silently drops the refresh cookie and /auth/refresh always 401s.
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
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
};

// @route   POST /api/v1/auth/force-reset-password
// @access  Private
exports.forceResetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    await logActivity({
      title: 'Password Force Reset',
      desc: `${user.name} forcefully reset their password from settings`,
      type: 'security',
      user: user._id,
      userName: user.name,
      color: 'bg-red-500'
    });

    res.status(200).json({ success: true, message: 'Password forcefully reset.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/v1/auth/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).sort('-createdAt');
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create a user (Admin only)
// @route   POST /api/v1/auth/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Please provide all fields (name, email, password, role)' });
    }

    // Check if user exists (Case-insensitive check)
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, error: 'A user with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role
    });

    await logActivity({
      title: 'User Account Created',
      desc: `Admin ${req.user.name} created a new ${role} account for ${name} (${email})`,
      type: 'admin',
      user: req.user._id,
      userName: req.user.name,
      color: 'bg-primary'
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete a user (Admin only)
// @route   DELETE /api/v1/auth/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Prevent deleting oneself
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own admin account' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logActivity({
      title: 'User Account Deleted',
      desc: `Admin ${req.user.name} deleted the account of ${user.name} (${user.email})`,
      type: 'admin',
      user: req.user._id,
      userName: req.user.name,
      color: 'bg-red-500'
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

