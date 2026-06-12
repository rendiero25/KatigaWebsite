const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code:           { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  discountType:   { type: String, enum: ['percent', 'fixed'], required: true },
  discountValue:  { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount:    { type: Number, default: 0 },
  usageLimit:     { type: Number, default: 0 },
  usedCount:      { type: Number, default: 0 },
  perUserLimit:   { type: Number, default: 0 },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date, required: true },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Voucher', voucherSchema);
