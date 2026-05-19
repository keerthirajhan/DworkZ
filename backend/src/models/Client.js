const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add the client name']
  },
  companyName: {
    type: String,
    required: [true, 'Please add a company name']
  },
  contactEmail: {
    type: String,
    required: [true, 'Please add a contact email'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  contactPhone: {
    type: String,
    required: [true, 'Please add a contact phone number']
  },
  alternatePhone: {
    type: String,
    default: ''
  },
  planType: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
    required: [true, 'Please specify plan type']
  },
  workspaceType: {
    type: String,
    enum: ['Individual Seat', 'Dedicated Desk', 'Cabin', 'Meeting Room', 'Virtual Office', 'Custom', 'Desk', 'Other'],
    required: [true, 'Please specify workspace type']
  },
  seats: {
    type: Number,
    default: 1
  },
  workspaceDetails: {
    type: String, // E.g. "Cabin 4" or "Desk 12"
    required: [true, 'Please specify workspace details']
  },
  
  // CRM Specific Fields
  priority: {
    type: String,
    enum: ['Hot', 'Warm', 'Cold'],
    default: 'Warm'
  },
  source: {
    type: String,
    enum: ['Walk-in', 'Website', 'Referral', 'Social Media', 'Other', 'Direct'],
    default: 'Direct'
  },
  budgetRange: {
    type: String,
    default: ''
  },
  assignedStaff: {
    type: String,
    default: 'Unassigned'
  },
  enquiryDate: {
    type: Date,
    default: Date.now
  },
  lastContacted: {
    type: Date
  },
  nextFollowUp: {
    type: Date
  },
  rejectionReason: {
    type: String,
    enum: ['', 'Too costly', 'Location', 'Not matching requirement', 'Competitor', 'Other'],
    default: ''
  },
  notes: [{
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],

  startDate: {
    type: Date,
    default: Date.now
  },
  preferredDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  rentAmount: {
    type: Number,
    required: [true, 'Please add the rent amount']
  },
  status: {
    type: String,
    enum: ['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Awaiting Signature', 'Converted', 'Active', 'Inactive', 'Expired', 'Rejected', 'Archived', 'Awaiting Activation', 'Agreement Pending', 'Hold'],
    default: 'New Lead'
  },
  billingDetails: {
    gstNumber: {
      type: String,
      default: ''
    },
    billingAddress: String
  },
  holidays: [{ type: Date }],
  onboardingDate: { type: Date },
  agreementPDFUrl: { type: String }, // Permanent backup of the signed/uploaded agreement PDF
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: false
  },
  // Proposal & Pricing Intelligence
  pricingDetails: {
    pricePerSeat: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    meetingRoomRate: { type: Number, default: 500 }
  },
  proposalCreated: {
    type: Boolean,
    default: false
  },
  proposalPDFUrl: {
    type: String,
    default: ''
  },
  proposalSent: {
    type: Boolean,
    default: false
  },
  proposalSentDate: {
    type: Date
  },
  profilePhotoUrl: {
    type: String,
    default: ''
  },
  holidayPDFUrl: {
    type: String,
    default: ''
  },
  agreementPDFUrl: {
    type: String,
    default: ''
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  cancelledAt: {
    type: Date
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActionBy: { type: String }, // Store the name of the user who did the last action
  lastActionAt: { type: Date },
  // CLIENT PORTAL CREDENTIALS
  portalPassword: { type: String, select: false }, // Hashed password for client self-service portal
  portalEnabled: { type: Boolean, default: false }
});

// INDEXES FOR CRM PERFORMANCE
ClientSchema.index({ companyName: 1 });
ClientSchema.index({ contactEmail: 1 });
ClientSchema.index({ status: 1 });
ClientSchema.index({ isArchived: 1 });

// Encrypt portal password using bcrypt
ClientSchema.pre('save', async function() {
  if (!this.isModified('portalPassword')) {
    return;
  }
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  this.portalPassword = await bcrypt.hash(this.portalPassword, salt);
});

module.exports = mongoose.model('Client', ClientSchema);
