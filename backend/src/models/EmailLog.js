const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    required: false
  },
  email: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Proposal', 'Invoice', 'Agreement', 'Payment Reminder', 'General', 'OTP'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Sent', 'Delivered', 'Failed', 'Opened', 'Sent (Dev Log)'],
    default: 'Pending'
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  openedAt: {
    type: Date
  },
  attachmentName: {
    type: String
  },
  errorMessage: {
    type: String
  },
  messageId: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmailLog', EmailLogSchema);
