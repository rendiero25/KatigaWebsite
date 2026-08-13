const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  variantId:    { type: String, default: '' },
  variantName:  { type: String, default: '' },
  name:         { type: String, required: true },
  image:        { type: String, default: '' },
  priceNumeric: { type: Number, required: true },
  weightGrams:  { type: Number, default: 0 },
  dimensions: {
    length: { type: Number, default: 1 },
    width:  { type: Number, default: 1 },
    height: { type: Number, default: 1 },
  },
  quantity:     { type: Number, required: true, min: 1 },
  subtotal:     { type: Number, required: true },
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
  recipientName: { type: String, default: '' },
  phone:         { type: String, default: '' },
  street:        { type: String, default: '' },
  city:          { type: String, default: '' },
  province:      { type: String, default: '' },
  postalCode:    { type: String, default: '' },
  areaId:        { type: String, default: '' },
  areaName:      { type: String, default: '' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerSnapshot: {
    name:  { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
  },

  items: [orderItemSchema],

  subtotal:        { type: Number, required: true },
  shippingCost:    { type: Number, required: true },
  voucherCode:     { type: String, default: '' },
  voucherDiscount: { type: Number, default: 0 },
  voucherReserved: { type: Boolean, default: false },
  voucherConsumed: { type: Boolean, default: false },
  total:           { type: Number, required: true },

  shippingAddress:     shippingAddressSchema,
  shippingCourier:     { type: String, default: '' },
  shippingService:     { type: String, default: '' },
  shippingServiceName: { type: String, default: '' },
  estimatedDays:       { type: String, default: '' },

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'expired', 'refunded', 'refund_pending'],
    default: 'pending',
  },
  orderCode:        { type: String, unique: true, sparse: true },
  paymentRef:       { type: String, unique: true, sparse: true },
  paymentLinkId:    { type: String, default: '' },
  paymentLink:      { type: String, default: '' },
  paymentExpiredAt: { type: Date },
  paymentMethod:    { type: String, default: '' },

  orderStatus: {
    type: String,
    enum: ['awaiting_payment', 'processing', 'packing', 'shipped', 'delivered', 'cancelled'],
    default: 'awaiting_payment',
  },
  cancelledAt: { type: Date },
  biteshipOrderId:      { type: String, default: '' },
  biteshipTrackingCode: { type: String, default: '' },
  biteshipWaybillId:    { type: String, default: '' },

  adminNote: { type: String, default: '' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

orderSchema.index({ customer: 1 });
orderSchema.index({ orderStatus: 1, paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ deletedAt: 1 });

// Order yang di-soft-delete harus tak terlihat oleh SEMUA jalur baca, bukan hanya yang
// diingat penulisnya. Dipasang di skema karena ada 26 call site, lima di antaranya
// aggregate() yang membaca field mentah dan melewati skema. Opt-out: .setOptions({ withDeleted: true })
// pada query, atau aggregate([...], { withDeleted: true }).
// countDocuments dan distinct tidak cocok dengan /^find/, jadi didaftarkan eksplisit.
orderSchema.pre(
  ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace', 'countDocuments', 'distinct'],
  function () {
    if (this.getOptions().withDeleted) return;
    this.where({ deletedAt: null });
  },
);

orderSchema.pre('aggregate', function () {
  if (this.options?.withDeleted) return;
  this.pipeline().unshift({ $match: { deletedAt: null } });
});

module.exports = mongoose.model('Order', orderSchema);
