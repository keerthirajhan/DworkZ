const Client = require('../models/Client');
const Booking = require('../models/Booking');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logActivity = require('../utils/activityLogger');

// ─── ADMIN: Create or Reset Portal Credentials ───────────────────────────────
// @route  POST /api/v1/client-portal/admin/setup/:clientId
// @access Private (Admin/Staff)
exports.setupPortalCredentials = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    const client = await Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    // Assign plain password — the Client model's pre('save') hook will hash it
    client.portalPassword = password;
    client.portalEnabled = true;
    await client.save();

    res.status(200).json({ success: true, message: `Portal credentials created for ${client.companyName}. Login: ${client.contactEmail}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── CLIENT: Login ────────────────────────────────────────────────────────────
// @route  POST /api/v1/client-portal/login
// @access Public
exports.clientPortalLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    // Find active client by email, explicitly select password
    const client = await Client.findOne({
      contactEmail: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
      portalEnabled: true,
      status: 'Active'
    }).select('+portalPassword');

    if (!client || !client.portalPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials or portal access not enabled.' });
    }

    const isMatch = await bcrypt.compare(password, client.portalPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    // Issue a scoped JWT for the client portal
    const token = jwt.sign(
      { id: client._id, type: 'client_portal', email: client.contactEmail },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      success: true,
      token,
      client: {
        _id: client._id,
        name: client.name,
        companyName: client.companyName,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone,
        planType: client.planType,
        workspaceType: client.workspaceType,
        workspaceDetails: client.workspaceDetails,
        rentAmount: client.rentAmount,
        seats: client.seats,
        onboardingDate: client.onboardingDate,
        status: client.status,
        pricingDetails: client.pricingDetails
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── CLIENT: Change Password ──────────────────────────────────────────────────
// @route  POST /api/v1/client-portal/change-password
// @access Client Portal (JWT)
exports.changePortalPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const client = await Client.findById(req.clientPortal.id).select('+portalPassword');
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const isMatch = await bcrypt.compare(currentPassword, client.portalPassword);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Current password is incorrect.' });

    // Assign plain new password — the Client model's pre('save') hook will hash it
    client.portalPassword = newPassword;
    await client.save();

    res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── CLIENT: Get My Profile ───────────────────────────────────────────────────
// @route  GET /api/v1/client-portal/me
// @access Client Portal (JWT)
exports.getMyProfile = async (req, res) => {
  try {
    const client = await Client.findById(req.clientPortal.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
    res.status(200).json({ success: true, data: client });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── CLIENT: Get My Bookings ──────────────────────────────────────────────────
// @route  GET /api/v1/client-portal/bookings
// @access Client Portal (JWT)
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ client: req.clientPortal.id }).sort({ date: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── CLIENT: Create a Booking ─────────────────────────────────────────────────
// @route  POST /api/v1/client-portal/bookings
// @access Client Portal (JWT)
exports.createMyBooking = async (req, res) => {
  try {
    const client = await Client.findById(req.clientPortal.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const { roomName, date, startTime, endTime, duration, notes } = req.body;

    // Conflict check
    const conflict = await Booking.findOne({
      roomName,
      date: new Date(date),
      status: 'Confirmed',
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });

    if (conflict) {
      return res.status(409).json({ success: false, error: `${roomName} is already booked during that time slot.` });
    }

    const booking = await Booking.create({
      client: client._id,
      clientName: client.companyName,
      roomName,
      date: new Date(date),
      startTime,
      endTime,
      duration: Number(duration),
      notes,
      hourlyRate: client.pricingDetails?.meetingRoomRate || 500,
      status: 'Confirmed'
    });

    await logActivity({
      title: 'Member Portal Booking',
      desc: `${client.companyName} self-booked ${roomName} on ${new Date(date).toLocaleDateString()} (${startTime} - ${endTime})`,
      type: 'booking',
      user: client._id,
      userName: client.companyName,
      color: 'bg-emerald-500'
    });

    global.io?.emit('bookingUpdated');

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── CLIENT: Cancel a Booking ─────────────────────────────────────────────────
// @route  PUT /api/v1/client-portal/bookings/:bookingId/cancel
// @access Client Portal (JWT)
exports.cancelMyBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.bookingId, client: req.clientPortal.id });
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found or access denied.' });

    booking.status = 'Cancelled';
    await booking.save();

    await logActivity({
      title: 'Portal Booking Cancelled',
      desc: `${booking.clientName} cancelled their booking for ${booking.roomName} on ${new Date(booking.date).toLocaleDateString()}`,
      type: 'booking',
      user: req.clientPortal.id,
      userName: booking.clientName,
      color: 'bg-rose-500'
    });

    global.io?.emit('bookingUpdated');

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── CLIENT: Delete a Booking (Permanent) ────────────────────────────────────
// @route  DELETE /api/v1/client-portal/bookings/:bookingId
// @access Client Portal (JWT)
exports.deleteMyBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({ _id: req.params.bookingId, client: req.clientPortal.id });
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found or access denied.' });

    await logActivity({
      title: 'Portal Booking Deleted',
      desc: `${booking.clientName} permanently deleted a booking record for ${booking.roomName}`,
      type: 'booking',
      user: req.clientPortal.id,
      userName: booking.clientName,
      color: 'bg-slate-500'
    });

    global.io?.emit('bookingUpdated');

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

