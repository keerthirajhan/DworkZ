const mongoose = require('mongoose');

const VisitorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  companyName: { type: String },
  personToVisit: { type: String, required: true },
  purpose: { type: String, enum: ['Meeting', 'Day Pass', 'Hourly Pass', 'Vendor / Maintenance', 'Weekly Pass', 'Others'], required: true },
  email: { type: String, required: true },
  aadharNumber: { type: String, required: true },
  idProofUrl: { type: String }, // To store S3 URL
  timeIn: { type: Date, default: Date.now },
  timeOut: { type: Date },
  status: { type: String, enum: ['Checked In', 'Completed'], default: 'Checked In' },
  invoiceGenerated: { type: Boolean, default: false },
  isOtpVerified: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  lastActionBy: { type: String }, // Store the name of the user who did the last action
  lastActionAt: { type: Date }
});
module.exports = mongoose.model('Visitor', VisitorSchema);
