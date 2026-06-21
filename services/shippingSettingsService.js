const mongoose = require('mongoose');
const ShippingSettings = require('../models/ShippingSettings');

const SHIPPING_SETTINGS_SINGLETON_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const DEFAULT_EMPTY_STATE_MESSAGE = 'Metode pengiriman sedang tidak tersedia untuk alamat ini.';

const normalizeEnabledCouriers = (codes, supportedCodes) => {
  if (!Array.isArray(codes)) {
    return [];
  }

  const allowed = new Set(
    codes.filter((code) => typeof code === 'string' && supportedCodes.includes(code))
  );

  return supportedCodes.filter((code) => allowed.has(code));
};

const normalizeEmptyStateMessage = (value) => {
  if (typeof value !== 'string') {
    return DEFAULT_EMPTY_STATE_MESSAGE;
  }

  const trimmed = value.trim();
  return trimmed || DEFAULT_EMPTY_STATE_MESSAGE;
};

const toShippingSettingsResponse = (settings, supportedCouriers) => ({
  enabledCouriers: normalizeEnabledCouriers(settings.enabledCouriers, supportedCouriers.map((c) => c.code)),
  emptyStateMessage: normalizeEmptyStateMessage(settings.emptyStateMessage),
  supportedCouriers,
});

async function getOrCreateShippingSettings(supportedCodes = []) {
  const settings = await ShippingSettings.findOneAndUpdate(
    { _id: SHIPPING_SETTINGS_SINGLETON_ID },
    {
      $setOnInsert: {
        enabledCouriers: [...supportedCodes],
        emptyStateMessage: DEFAULT_EMPTY_STATE_MESSAGE,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return settings;
}

module.exports = {
  DEFAULT_EMPTY_STATE_MESSAGE,
  getOrCreateShippingSettings,
  normalizeEnabledCouriers,
  normalizeEmptyStateMessage,
  toShippingSettingsResponse,
};
