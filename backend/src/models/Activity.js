const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  desc: { type: String, required: true },
  type: { type: String, enum: ['client', 'payment', 'booking', 'inventory', 'visitor', 'system'], default: 'system' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName: { type: String }, // Store name for quick display without population
  color: { type: String, default: 'bg-primary' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', ActivitySchema);
