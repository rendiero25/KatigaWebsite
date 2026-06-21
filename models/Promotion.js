const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  bannerImage: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  type: { type: String, enum: ['products', 'category'], required: true },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory', default: null },
  discountPercent: { type: Number, required: true, min: 1, max: 100 },
  isVisible: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Promotion', promotionSchema);
