const mongoose = require('mongoose');
 
// A small, rarely-edited catalog of "how much does one of these cost".
// Deliberately separate from RefreshmentLog — staff sets this occasionally
// (e.g. once when a rate changes, or once the first time a new "Other" item
// is used), never as part of the fast daily-entry workflow.
const RefreshmentPricingSchema = new mongoose.Schema({
  itemName: { type: String, required: true, trim: true, unique: true },
  unitPrice: { type: Number, required: true, min: 0 }
}, { timestamps: true });
 
module.exports = mongoose.model('RefreshmentPricing', RefreshmentPricingSchema);
 