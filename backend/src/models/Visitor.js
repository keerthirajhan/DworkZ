const mongoose = require('mongoose');

const VisitorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  companyName: { type: String },
  companyAddress: { type: String },
  gstNumber: { type: String },
  personToVisit: { type: String },
  purpose: { type: String, enum: ['Meeting', 'Day Pass', 'Hourly Pass', 'Vendor / Maintenance', 'Weekly Pass', 'Others'], required: true },
  // OTP-based email verification was removed from the check-in flow, so
  // email is now optional to match the UI (which already marks it
  // "Optional"). Previously required: true here caused check-ins without
  // an email to fail server-side even though the frontend allowed them.
  email: { type: String },
  // The full Aadhaar number is never stored (compliance — see BUG-05 fix).
  // Only a keyed HMAC hash (for potential future exact-match lookup, not
  // reversible) and the last 4 digits (for the masked display already used
  // in the UI) are persisted.
  aadharLast4: { type: String, required: true },
  aadharHash: { type: String, required: true, select: false },
  idProofUrl: { type: String }, // To store S3 URL
  timeIn: { type: Date, default: Date.now },
  timeOut: { type: Date },
  status: { type: String, enum: ['Checked In', 'Completed'], default: 'Checked In' },
  invoiceGenerated: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  lastActionBy: { type: String }, // Store the name of the user who did the last action
  lastActionAt: { type: Date }
});
module.exports = mongoose.model('Visitor', VisitorSchema);
