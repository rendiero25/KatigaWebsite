const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getCouriers } = require('../services/biteshipService');
const {
  getOrCreateShippingSettings,
  normalizeEnabledCouriers,
  normalizeEmptyStateMessage,
  toShippingSettingsResponse,
} = require('../services/shippingSettingsService');

router.get('/', auth, async (req, res) => {
  try {
    const supportedCouriers = await getCouriers();
    const settings = await getOrCreateShippingSettings(supportedCouriers.map((c) => c.code));
    res.json(toShippingSettingsResponse(settings, supportedCouriers));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const { enabledCouriers, emptyStateMessage } = req.body ?? {};

    if (!Array.isArray(enabledCouriers)) {
      return res.status(400).json({ message: 'enabledCouriers wajib berupa array' });
    }

    if (typeof emptyStateMessage !== 'string') {
      return res.status(400).json({ message: 'emptyStateMessage wajib berupa string' });
    }

    const supportedCouriers = await getCouriers();
    const supportedCodes = supportedCouriers.map((c) => c.code);
    const settings = await getOrCreateShippingSettings(supportedCodes);

    settings.enabledCouriers = normalizeEnabledCouriers(enabledCouriers, supportedCodes);
    settings.emptyStateMessage = normalizeEmptyStateMessage(emptyStateMessage);

    await settings.save();

    res.json(toShippingSettingsResponse(settings, supportedCouriers));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
