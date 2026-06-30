const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerSnapshot: {
    name:  { type: String, default: '' },
    email: { type: String, default: '' },
  },
  type: { type: String, enum: ['complaint', 'return'], required: true },
  reason: { type: String, required: true },
  photos: [{ type: String }],
  status: {
    type: String,
    enum: ['open', 'processing', 'resolved', 'rejected'],
    default: 'open',
  },
  adminNote: { type: String, default: '' },
  resolvedAt: { type: Date },
}, { timestamps: true });

complaintSchema.index({ customer: 1 });
complaintSchema.index({ order: 1 });
complaintSchema.index({ status: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
