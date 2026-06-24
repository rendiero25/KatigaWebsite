const mongoose = require('mongoose');

const DEFAULT_EMPTY_STATE_MESSAGE = 'Metode pengiriman sedang tidak tersedia untuk alamat ini.';

const shippingSettingsSchema = new mongoose.Schema({
  enabledCouriers: {
    type: [String],
    default: () => [],
  },
  emptyStateMessage: {
    type: String,
    default: DEFAULT_EMPTY_STATE_MESSAGE,
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('ShippingSettings', shippingSettingsSchema);
