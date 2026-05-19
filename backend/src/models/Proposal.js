const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  status: { type: String, default: 'Sent' },
  
  proposedPlan: { type: String },
  proposedRent: { type: Number },
  workspaceType: { type: String },
  workspaceDetails: { type: String },
  
  rejectionReason: { type: String },
  rejectionFeedback: { type: String },
  
  generatedPdfUrl: { type: String },
  validUntil: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Proposal', ProposalSchema);
