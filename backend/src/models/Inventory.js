const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  itemId: { type: String },
  itemName: { type: String, required: true },
  purchasedQuantity: { type: Number, required: true },
  inHandQuantity: { type: Number, required: true },
  unitPrice: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  vendorDetails: { type: String, required: true },
  purchaseDate: { type: Date, default: Date.now },
  paymentStatus: { type: String, enum: ['Paid', 'Credit'], required: true },
  paymentMethod: { type: String, enum: ['Cash', 'GPay', 'Bank Transfer', 'N/A'], default: 'N/A' },
  billCopyUrl: { type: String },
  addedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', InventorySchema);
