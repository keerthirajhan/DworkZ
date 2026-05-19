const Visitor = require('../models/Visitor');
const axios = require('axios');
const emailService = require('../services/emailService');
const logActivity = require('../utils/activityLogger');

// Temporary in-memory store for OTPs (In production, use Redis or similar)
const otpStore = new Map();

exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  console.log(`\x1b[35m[OTP REQUEST]\x1b[0m Received request for: ${email}`);
  if (!email) return res.status(400).json({ success: false, error: 'Email address is required' });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP with 5-minute expiry
  otpStore.set(email, { 
    otp, 
    expires: Date.now() + 5 * 60 * 1000 
  });

  try {
    const otpHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #14b8a6; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">DWORKZ</h1>
          <p style="color: #666; margin: 5px 0 0; font-size: 14px;">Premium Workspace Verification</p>
        </div>
        <div style="background-color: #f9fafb; padding: 30px; border-radius: 12px; text-align: center; border: 1px solid #edf2f7;">
          <p style="font-size: 16px; color: #4a5568; margin-bottom: 10px;">Hello,</p>
          <p style="font-size: 16px; color: #4a5568; margin-bottom: 25px;">Your One-Time Password (OTP) for visitor check-in is:</p>
          <div style="background-color: #ffffff; padding: 20px; display: inline-block; border-radius: 12px; border: 2px solid #14b8a6; min-width: 200px;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #111; font-family: monospace;">${otp}</span>
          </div>
          <p style="font-size: 13px; color: #a0aec0; margin-top: 25px; font-style: italic;">This code is valid for 5 minutes. Please do not share this code with anyone for security reasons.</p>
        </div>
        <p style="font-size: 11px; color: #cbd5e0; text-align: center; margin-top: 30px;">
          If you did not request this code, please ignore this email.<br>
          &copy; 2026 DworkZ Workspace Solutions.
        </p>
      </div>
    `;

    await emailService.sendEmail({
      to: email,
      subject: `Verification Code: ${otp} (DworkZ Check-in)`,
      html: otpHtml,
      type: 'OTP'
    });

    console.log(`\x1b[32m[OTP SUCCESS]\x1b[0m ${otp} generated for ${email}`);
  } catch (err) {
    console.error(`\x1b[31m[OTP ERROR]\x1b[0m Failed to process for ${email}:`);
    console.error(err.stack || err.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Could not send verification email.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
  
  res.status(200).json({ success: true, message: 'OTP sent successfully to email' });
};

exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record) return res.status(400).json({ success: false, error: 'OTP not requested or expired' });
  if (record.expires < Date.now()) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, error: 'OTP expired' });
  }

  if (record.otp === otp) {
    otpStore.delete(email);
    res.status(200).json({ success: true, message: 'OTP verified' });
  } else {
    res.status(400).json({ success: false, error: 'Invalid OTP' });
  }
};

exports.getVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find({ isArchived: false }).sort('-timeIn');
    res.status(200).json({ success: true, count: visitors.length, data: visitors });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.createVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.create({
      ...req.body,
      lastActionBy: req.user?.name || 'Kiosk',
      lastActionAt: Date.now()
    });

    if (req.user) {
      await logActivity({
        title: 'Visitor Checked In',
        desc: `${visitor.name} from ${visitor.companyName || 'Individual'} checked in to visit ${visitor.personToVisit}`,
        type: 'visitor',
        user: req.user.id,
        userName: req.user.name,
        color: 'bg-emerald-500'
      });
    }

    global.io?.emit('bookingUpdated');
    res.status(201).json({ success: true, data: visitor });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.checkOutVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, error: 'Visitor record not found' });
    }

    visitor.status = 'Completed';
    visitor.timeOut = Date.now();
    visitor.lastActionBy = req.user.name;
    visitor.lastActionAt = Date.now();
    await visitor.save();

    await logActivity({
      title: 'Visitor Checkout',
      desc: `${visitor.name} checked out from ${visitor.personToVisit}`,
      type: 'visitor',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-orange-500'
    });

    global.io?.emit('bookingUpdated');
    res.status(200).json({ success: true, data: visitor });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.archiveVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id, 
      { 
        isArchived: true, 
        archivedAt: Date.now(),
        lastActionBy: req.user.name,
        lastActionAt: Date.now()
      }, 
      { new: true }
    );

    await logActivity({
      title: 'Visitor Archived',
      desc: `Visitor log for ${visitor.name} moved to archives`,
      type: 'visitor',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-rose-500'
    });

    res.status(200).json({ success: true, data: visitor });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.getArchivedVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find({ isArchived: true }).sort('-archivedAt');
    res.status(200).json({ success: true, count: visitors.length, data: visitors });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.deleteVisitorPermanently = async (req, res) => {
  try {
    // Check if user is admin (added protection)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only administrators can delete data permanently.' });
    }
    await Visitor.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Visitor record deleted permanently.' });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};
