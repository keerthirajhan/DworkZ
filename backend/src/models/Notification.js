const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Recipient. Client Portal auth is scoped to the Client model (not the
  // main User model — see clientPortalMiddleware.js), so notifications are
  // addressed to a Client._id, matching how bookings already reference
  // their owner via Booking.client.
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking'
  },
  type: {
    type: String,
    enum: ['booking_created', 'booking_confirmed', 'booking_cancelled', 'booking_rescheduled', 'booking_updated'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  // Structured extra data for the frontend to render richer cards (e.g.
  // previous/new date-time for a reschedule) without parsing the message.
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

// Newest-first per-client lookups are the only real access pattern here.
NotificationSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
