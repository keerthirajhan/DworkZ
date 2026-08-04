const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Client = require('../models/Client');
const logActivity = require('../utils/activityLogger');

// @desc    Get all bookings (filterable by month)
// @route   GET /api/v1/bookings
// @access  Private
exports.getBookings = async (req, res, next) => {
  try {
    let query = { status: 'Confirmed' };
    
    if (req.user.role === 'client') {
      const client = await Client.findOne({ userId: req.user.id });
      if (client) {
        query.client = client._id;
      } else {
        query.user = req.user.id;
      }
    }

    if (req.query.month && req.query.year) {
      const start = new Date(req.query.year, req.query.month - 1, 1);
      const end = new Date(req.query.year, req.query.month, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    const bookings = await Booking.find(query).populate('client', 'name companyName').sort('date startTime');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get today's bookings (Quick View)
// @route   GET /api/v1/bookings/today
// @access  Private
exports.getTodayBookings = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await Booking.find({
      date: { $gte: today, $lt: tomorrow },
      status: 'Confirmed'
    }).populate('client', 'name companyName').sort('startTime');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create a public booking (External Website)
// @route   POST /api/v1/bookings/public
// @access  Public
exports.createPublicBooking = async (req, res, next) => {
  try {
    const { date, startTime, endTime, clientName, email, phone, hourlyRate } = req.body;

    // Reject bookings for a slot start time that has already passed.
    // Built as an explicit IST-offset ISO string rather than relying on
    // Date.setHours() (which uses whatever timezone the server process
    // happens to be configured with — often UTC on cloud hosts, which
    // would silently make this check wrong). An ISO string with a fixed
    // +05:30 offset represents an unambiguous absolute instant no matter
    // what timezone the server itself is running in. This single check
    // also covers any past date entirely, since an earlier date's slot
    // start is necessarily also before "now".
    const slotStartIST = new Date(`${date}T${startTime}:00+05:30`);
    if (isNaN(slotStartIST.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date or time.' });
    }
    if (slotStartIST <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot create a booking for a date/time that has already passed.'
      });
    }
    
    // Calculate Duration
    const s = parseInt(startTime.split(':')[0]);
    const e = parseInt(endTime.split(':')[0]);
    const duration = e - s;

    // Check for overlaps
    const overlap = await Booking.findOne({
      date: new Date(date),
      status: 'Confirmed',
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });

    if (overlap) {
      return res.status(400).json({ 
        success: false, 
        error: `This slot is already booked. Please choose another time.` 
      });
    }

    const booking = await Booking.create({
      date,
      startTime,
      endTime,
      duration,
      clientName,
      isGuest: true,
      guestDetails: { email, phone },
      hourlyRate: hourlyRate || 500,
      status: 'Confirmed'
    });

    await logActivity({
      title: 'External Booking Received',
      desc: `New public booking from ${clientName} via Website (${startTime} - ${endTime})`,
      type: 'booking',
      user: null, // System generated
      userName: 'External Website',
      color: 'bg-orange-500'
    });

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create a booking (Internal)
// @route   POST /api/v1/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
  try {
    const { date, startTime, endTime } = req.body;

    // Reject bookings for a slot start time that has already passed.
    // Built as an explicit IST-offset ISO string rather than relying on
    // Date.setHours() (which uses whatever timezone the server process
    // happens to be configured with — often UTC on cloud hosts, which
    // would silently make this check wrong). An ISO string with a fixed
    // +05:30 offset represents an unambiguous absolute instant no matter
    // what timezone the server itself is running in. This single check
    // also covers any past date entirely, since an earlier date's slot
    // start is necessarily also before "now".
    const slotStartIST = new Date(`${date}T${startTime}:00+05:30`);
    if (isNaN(slotStartIST.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date or time.' });
    }
    if (slotStartIST <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot create a booking for a date/time that has already passed.'
      });
    }

    // Calculate Duration
    const s = parseInt(startTime.split(':')[0]);
    const e = parseInt(endTime.split(':')[0]);
    req.body.duration = e - s;
    
    const overlap = await Booking.findOne({
      date: new Date(date),
      status: 'Confirmed',
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });

    if (overlap) {
      return res.status(400).json({ 
        success: false, 
        error: `Slot already booked by ${overlap.clientName} from ${overlap.startTime} to ${overlap.endTime}` 
      });
    }

    if (req.user.role === 'client') {
      const client = await Client.findOne({ userId: req.user.id });
      req.body.client = client?._id;
      req.body.user = req.user.id;
      req.body.clientName = client?.companyName || req.user.name;
    }

    req.body.history = [{ event: 'Created', by: req.user.name }];

    const booking = await Booking.create(req.body);

    await logActivity({
      title: 'Booking Created',
      desc: `Meeting room booked by ${booking.clientName} on ${new Date(booking.date).toLocaleDateString()} (${booking.startTime} - ${booking.endTime})`,
      type: 'booking',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-blue-500'
    });

    // If an admin/staff member created this booking on behalf of a portal
    // client, let that client know a booking now exists for them.
    if (booking.client && ['admin', 'staff'].includes(req.user.role)) {
      const { notifyClient, formatBookingDateTime } = require('../utils/notificationService');
      await notifyClient({
        clientId: booking.client,
        bookingId: booking._id,
        type: 'booking_created',
        title: 'Meeting Room Booking Created',
        message: `A meeting room booking has been created for you, scheduled for ${formatBookingDateTime(booking.date, booking.startTime)}.`,
        metadata: { roomName: booking.roomName, date: booking.date, startTime: booking.startTime, endTime: booking.endTime }
      });
    }

    global.io?.emit('bookingUpdated');

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update a booking
// @route   PUT /api/v1/bookings/:id
// @access  Private (Admin/Staff)
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit bookings' });
    }

    // Snapshot pre-update values to detect what actually changed, so we can
    // send a "rescheduled" notification when the date/time moves versus a
    // generic "updated" notification for other field edits.
    const prevDate = booking.date;
    const prevStartTime = booking.startTime;
    const prevEndTime = booking.endTime;

    const { date, startTime, endTime } = req.body;
    if (date || startTime || endTime) {
      const checkDate = date ? new Date(date) : booking.date;
      const checkStart = startTime || booking.startTime;
      const checkEnd = endTime || booking.endTime;

      const overlap = await Booking.findOne({
        _id: { $ne: req.params.id },
        date: checkDate,
        status: 'Confirmed',
        $or: [
          { startTime: { $lt: checkEnd }, endTime: { $gt: checkStart } }
        ]
      });

      if (overlap) {
        return res.status(400).json({ 
          success: false, 
          error: `Revised slot overlaps with ${overlap.clientName} (${overlap.startTime} - ${overlap.endTime})` 
        });
      }
      
      if (startTime || endTime) {
        const s = parseInt(checkStart.split(':')[0]);
        const e = parseInt(checkEnd.split(':')[0]);
        req.body.duration = e - s;
      }
    }

    delete req.body.history; // never accept history from the client directly

    const isReschedule = (date && new Date(date).getTime() !== new Date(prevDate).getTime())
      || (startTime && startTime !== prevStartTime)
      || (endTime && endTime !== prevEndTime);

    // Any other field present on the request besides date/time/duration
    // counts as a plain "updated" edit (e.g. roomName, notes).
    const otherFieldsChanged = Object.keys(req.body).some(
      key => !['date', 'startTime', 'endTime', 'duration'].includes(key)
    );

    booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
        $push: { history: { event: isReschedule ? 'Rescheduled' : 'Updated', by: req.user.name } }
      },
      { new: true, runValidators: true }
    );

    if (booking.client) {
      const { notifyClient, formatBookingDateTime } = require('../utils/notificationService');
      if (isReschedule) {
        await notifyClient({
          clientId: booking.client,
          bookingId: booking._id,
          type: 'booking_rescheduled',
          title: 'Meeting Room Booking Rescheduled',
          message: `Your meeting room booking has been rescheduled.\n\nPrevious: ${formatBookingDateTime(prevDate, prevStartTime)}\nNew: ${formatBookingDateTime(booking.date, booking.startTime)}`,
          metadata: {
            previousDate: prevDate, previousStartTime: prevStartTime, previousEndTime: prevEndTime,
            newDate: booking.date, newStartTime: booking.startTime, newEndTime: booking.endTime
          }
        });
      } else if (otherFieldsChanged) {
        await notifyClient({
          clientId: booking.client,
          bookingId: booking._id,
          type: 'booking_updated',
          title: 'Meeting Room Booking Updated',
          message: 'Your meeting room booking details have been updated. Please review the latest schedule.',
          metadata: { roomName: booking.roomName, date: booking.date, startTime: booking.startTime, endTime: booking.endTime }
        });
      }
    }

    global.io?.emit('bookingUpdated');

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get archived (cancelled) bookings
// @route   GET /api/v1/bookings/archived
// @access  Private
exports.getArchivedBookings = async (req, res, next) => {
  try {
    const BookingModel = mongoose.models.Booking || mongoose.model('Booking', require('../models/Booking').schema);
    
    const bookings = await BookingModel.find({ status: 'Cancelled' })
      .populate('client', 'name companyName')
      .sort('-updatedAt');

    const transformed = bookings.map(b => ({
      _id: b._id,
      name: b.clientName || 'Unnamed Client',
      source: 'Bookings',
      archivedAt: b.updatedAt || b.createdAt || new Date(),
      companyName: b.client?.companyName || 'N/A',
      contactPhone: (b.startTime || '??') + ' - ' + (b.endTime || '??'),
      notes: b.notes || ''
    }));

    res.status(200).json({
      success: true,
      count: transformed.length,
      data: transformed
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Cancel a booking
// @route   DELETE /api/v1/bookings/:id
// @access  Private
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    const isStaffOrAdmin = ['admin', 'staff'].includes(req.user.role);
    if (!isStaffOrAdmin && booking.user?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to cancel this booking' });
    }
    booking.status = 'Cancelled';
    booking.history.push({ event: 'Cancelled', by: req.user.name });
    await booking.save();

    await logActivity({
      title: 'Booking Cancelled',
      desc: `Meeting room booking for ${booking.clientName} on ${new Date(booking.date).toLocaleDateString()} was cancelled`,
      type: 'booking',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-rose-500'
    });

    // Only notify when an admin/staff member cancels on the client's
    // behalf — a client cancelling their own booking (via the main booking
    // flow, if ever reached this way) doesn't need to be told about their
    // own action.
    if (booking.client && isStaffOrAdmin) {
      const { notifyClient, formatBookingDateTime } = require('../utils/notificationService');
      await notifyClient({
        clientId: booking.client,
        bookingId: booking._id,
        type: 'booking_cancelled',
        title: 'Meeting Room Booking Cancelled',
        message: `Your meeting room booking scheduled for ${formatBookingDateTime(booking.date, booking.startTime)} has been cancelled by the administrator.`,
        metadata: { roomName: booking.roomName, date: booking.date, startTime: booking.startTime, endTime: booking.endTime }
      });
    }

    global.io?.emit('bookingUpdated');

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Restore a cancelled/archived booking back to Confirmed
// @route   PUT /api/v1/bookings/:id/restore
// @access  Private (Admin/Staff)
exports.restoreBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // The slot may have since been booked by someone else while this one was
    // cancelled — check before restoring rather than silently double-booking.
    const overlap = await Booking.findOne({
      _id: { $ne: req.params.id },
      date: booking.date,
      status: 'Confirmed',
      $or: [
        { startTime: { $lt: booking.endTime }, endTime: { $gt: booking.startTime } }
      ]
    });

    if (overlap) {
      return res.status(400).json({
        success: false,
        error: `Cannot restore — this slot is now booked by ${overlap.clientName} (${overlap.startTime} - ${overlap.endTime}).`
      });
    }

    booking.status = 'Confirmed';
    booking.history.push({ event: 'Restored', by: req.user.name });
    await booking.save();

    await logActivity({
      title: 'Booking Restored',
      desc: `Meeting room booking for ${booking.clientName} on ${new Date(booking.date).toLocaleDateString()} was restored`,
      type: 'booking',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-emerald-500'
    });

    global.io?.emit('bookingUpdated');

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Permanently delete a booking
// @route   DELETE /api/v1/bookings/:id/permanent
// @access  Private (Admin Only)
exports.deleteBookingPermanent = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only administrators can permanently delete records' });
    }
    await booking.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Permanently delete multiple bookings
// @route   DELETE /api/v1/bookings/bulk-permanent
// @access  Private (Admin Only)
exports.deleteBookingsBulkPermanent = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'Please provide an array of IDs' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only administrators can permanently delete records' });
    }
    await Booking.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};