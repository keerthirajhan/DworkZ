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

    // Reject bookings for dates that have already passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return res.status(400).json({
        success: false,
        error: 'Cannot create a booking for a past date.'
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

    // Reject bookings for dates that have already passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return res.status(400).json({
        success: false,
        error: 'Cannot create a booking for a past date.'
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

    const booking = await Booking.create(req.body);

    await logActivity({
      title: 'Booking Created',
      desc: `Meeting room booked by ${booking.clientName} on ${new Date(booking.date).toLocaleDateString()} (${booking.startTime} - ${booking.endTime})`,
      type: 'booking',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-blue-500'
    });

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

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

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
    if (!['admin', 'staff'].includes(req.user.role) && booking.user?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to cancel this booking' });
    }
    booking.status = 'Cancelled';
    await booking.save();

    await logActivity({
      title: 'Booking Cancelled',
      desc: `Meeting room booking for ${booking.clientName} on ${new Date(booking.date).toLocaleDateString()} was cancelled`,
      type: 'booking',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-rose-500'
    });

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
