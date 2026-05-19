const mongoose = require('mongoose');

const AgreementSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  proposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' },
  status: { type: String, enum: ['Pending Signature', 'Signed', 'Expired', 'Archived'], default: 'Pending Signature' },
  
  agreementPDFUrl: { type: String },
  draftPDFUrl: { type: String },
  isSentToClient: { type: Boolean, default: false },
  
  signatureData: {
    ipAddress: String,
    timestamp: Date,
    hash: String,
    signatureImageUrl: String,  // Base64 drawn signature
    signedBy: String,           // Full name of signatory
    deviceInfo: String          // Browser/OS for audit trail
  },
  
  startDate: { type: Date },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Agreement', AgreementSchema);
