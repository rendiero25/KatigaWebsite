const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customer:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  order:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  rating:    { type: Number, min: 1, max: 5, required: true },
  comment:   { type: String, default: '', maxlength: 1000 },
  photos:    { type: [String], default: [] },
  isVisible: { type: Boolean, default: true },
}, { timestamps: true });

reviewSchema.index({ customer: 1, order: 1, product: 1 }, { unique: true });
reviewSchema.index({ product: 1, isVisible: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
