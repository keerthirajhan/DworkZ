const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  client: { 
    type: mongoose.Schema.ObjectId, 
    ref: 'Client', 
    required: false 
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: false
  },
  clientName: { 
    type: String, 
    required: true 
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  guestDetails: {
    email: String,
    phone: String,
    aadharNumber: String
  },
  hourlyRate: {
    type: Number,
    default: 500
  },
  invoiceGenerated: {
    type: Boolean,
    default: false
  },
  roomName: { 
    type: String, 
    required: true, 
    default: 'Meeting Room' 
  },
  date: { 
    type: Date, 
    required: true 
  },
  startTime: { 
    type: String, 
    required: true // Format: "09:00"
  },
  endTime: {
    type: String,
    required: true // Format: "10:00"
  },
  duration: { 
    type: Number, 
    required: true // in hours
  },
  status: { 
    type: String, 
    enum: ['Confirmed', 'Cancelled'], 
    default: 'Confirmed' 
  },
  notes: {
    type: String
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// INDEXES FOR CALENDAR PERFORMANCE
BookingSchema.index({ date: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ client: 1 });
BookingSchema.index({ user: 1 });

// Clear the model if it already exists (useful for dev environments)
if (mongoose.models.Booking) {
  delete mongoose.models.Booking;
}

module.exports = mongoose.model('Booking', BookingSchema);
