const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  clientId: { type: mongoose.Schema.ObjectId, ref: 'Client', required: false },
  bookingId: { type: mongoose.Schema.ObjectId, ref: 'Booking', required: false },
  visitorId: { type: mongoose.Schema.ObjectId, ref: 'Visitor', required: false },
  isGuest: { type: Boolean, default: false },
  billingPeriod: { type: String, required: true }, // Format: "April 2026" or "One-time"
  baseAmount: { type: Number, required: true },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  overageAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Paid', 'Pending', 'Overdue'], default: 'Pending' },
  serviceDate: { type: Date },   // Date the client actually used the service
  serviceEndDate: { type: Date }, // End date if multiple days
  numberOfDays: { type: Number, default: 1 },
  issueDate: { type: Date, default: Date.now },     // Date the invoice is formally issued
  dateGenerated: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  sent: { type: Boolean, default: false },
  sentDate: { type: Date },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
