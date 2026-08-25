const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code:           { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  discountType:   { type: String, enum: ['percent', 'fixed'], required: true },
  discountValue:  { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount:    { type: Number, default: null },
  usageLimit:     { type: Number, default: 0 },
  usedCount:      { type: Number, default: 0 },
  perUserLimit:   { type: Number, default: 0 },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date, required: true },
  isActive:       { type: Boolean, default: true },

  // Cakupan: voucher berlaku untuk seluruh keranjang, atau hanya item yang
  // produknya / kategorinya terdaftar. Diskon dihitung dari subtotal item yang
  // memenuhi syarat saja, bukan subtotal keseluruhan.
  appliesTo:      { type: String, enum: ['all', 'products', 'categories'], default: 'all' },
  products:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  categories:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory' }],
}, { timestamps: true });

module.exports = mongoose.model('Voucher', voucherSchema);
