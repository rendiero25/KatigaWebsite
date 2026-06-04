const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name:         { type: String, required: true },
  image:        { type: String, default: '' },
  priceNumeric: { type: Number, required: true },
  weightGrams:  { type: Number, default: 0 },
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

  subtotal:    { type: Number, required: true },
  shippingCost:{ type: Number, required: true },
  total:       { type: Number, required: true },

  shippingAddress:     shippingAddressSchema,
  shippingCourier:     { type: String, default: '' },
  shippingService:     { type: String, default: '' },
  shippingServiceName: { type: String, default: '' },
  estimatedDays:       { type: String, default: '' },

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'expired', 'refunded'],
    default: 'pending',
  },
  midtransOrderId:     { type: String, unique: true, sparse: true },
  midtransToken:       { type: String, default: '' },
  midtransPaymentType: { type: String, default: '' },
  midtransFraudStatus: { type: String, default: '' },

  orderStatus: {
    type: String,
    enum: ['awaiting_payment', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'awaiting_payment',
  },
  biteshipOrderId:      { type: String, default: '' },
  biteshipTrackingCode: { type: String, default: '' },
  biteshipWaybillId:    { type: String, default: '' },

  adminNote: { type: String, default: '' },
}, { timestamps: true });

orderSchema.index({ customer: 1 });
orderSchema.index({ orderStatus: 1, paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
