const mongoose = require('mongoose');

// One row per client + item + calendar day. Daily Entry re-saves the same
// day UPDATE this row (see refreshmentController.saveDailyEntries) rather
// than creating duplicates, so staff can revisit and correct a day's
// numbers without double-counting.
//
// SIMPLIFIED (per redesign): only Coffee and Tea are tracked — no
// open-ended "Other" item, no notes field. Any pre-existing logs with a
// different itemName (from before this simplification) are left in the
// database untouched but are filtered out everywhere they'd be read, so
// nothing is destructively deleted, it's just no longer surfaced.
const RefreshmentLogSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },
  itemName: { type: String, required: true, trim: true, enum: ['Coffee', 'Tea'] },
  quantity: { type: Number, required: true, min: 1, default: 1 },

  // Pricing is intentionally NOT collected at daily-entry time — staff
  // never types a price. It's resolved from RefreshmentPricing and locked
  // in here only when an invoice is actually generated (see
  // generateRefreshmentInvoice), the same way Booking.hourlyRate is
  // snapshotted at booking time rather than recalculated later.
  unitPrice: { type: Number, min: 0, default: null },
  amount: { type: Number, default: null },

  date: { type: Date, required: true, index: true }, // calendar day this was logged for (not a timestamp)
  loggedBy: { type: String }, // display name of the staff member who logged it

  // Billing state. Once an invoice is generated from a batch of logs, those
  // logs are locked (see refreshmentController.deleteRefreshmentLog) so the
  // invoice total can never silently drift from what it was billed for.
  invoiceGenerated: { type: Boolean, default: false },
  invoice: { type: mongoose.Schema.ObjectId, ref: 'Invoice' },

  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

RefreshmentLogSchema.index({ client: 1, invoiceGenerated: 1 });
// One row per client+item+day — the upsert key used by saveDailyEntries.
RefreshmentLogSchema.index({ client: 1, date: 1, itemName: 1 }, { unique: true });

module.exports = mongoose.model('RefreshmentLog', RefreshmentLogSchema);

