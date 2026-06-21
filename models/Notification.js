const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ['admin', 'customer'], required: true },
  recipientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  type: {
    type: String,
    enum: [
      'order_new', 'payment_paid', 'payment_failed', 'review_new', 'contact_new', 'promo_expiring',
      'payment_confirmed', 'promo_new',
    ],
    required: true,
  },
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  link:      { type: String, default: '' },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  isRead:    { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, recipientId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
