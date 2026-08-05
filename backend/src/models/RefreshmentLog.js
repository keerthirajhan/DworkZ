const mongoose = require('mongoose');

const RefreshmentLogSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },
  itemName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  // Always computed server-side from quantity * unitPrice — never trust an
  // amount posted directly from the client, since this feeds real billing.
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  loggedBy: { type: String }, // display name of the admin/staff who logged it

  // Billing state. Once an invoice is generated from a batch of logs, those
  // logs are locked (see refreshmentController.deleteRefreshmentLog) so the
  // invoice total can never silently drift from what it was billed for.
  invoiceGenerated: { type: Boolean, default: false },
  invoice: { type: mongoose.Schema.ObjectId, ref: 'Invoice' },

  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

RefreshmentLogSchema.index({ client: 1, invoiceGenerated: 1 });

module.exports = mongoose.model('RefreshmentLog', RefreshmentLogSchema);
