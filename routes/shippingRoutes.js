const express = require('express');
const router = express.Router();
const customerAuth = require('../middleware/customerAuth');
const { searchAreas, getRates } = require('../services/biteshipService');
const { getOrCreateShippingSettings } = require('../services/shippingSettingsService');

const PROVIDER_EMPTY_MESSAGE = 'Tidak ada kurir tersedia untuk tujuan ini.';
const REQUEST_ERROR_MESSAGE = 'Gagal mengambil metode pengiriman';

// GET /api/shipping/areas?keyword=...
router.get('/areas', customerAuth, async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.length < 2) {
      return res.json([]);
    }

    const areas = await searchAreas(keyword);
    res.json(areas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/shipping/rates
router.post('/rates', customerAuth, async (req, res) => {
  const { destinationAreaId, items } = req.body;

  if (!destinationAreaId || !items?.length) {
    return res.status(400).json({ message: 'destinationAreaId dan items wajib diisi' });
  }

  if (!process.env.BITESHIP_ORIGIN_AREA_ID) {
    return res.status(500).json({ message: 'BITESHIP_ORIGIN_AREA_ID tidak dikonfigurasi di server' });
  }

  try {
    const settings = await getOrCreateShippingSettings();

    if (!settings.enabledCouriers.length) {
      return res.json({
        rates: [],
        reason: 'filtered_out',
        message: settings.emptyStateMessage,
      });
    }

    const providerRates = await getRates({ destinationAreaId, items, courierCodes: settings.enabledCouriers });

    if (!providerRates.length) {
      return res.json({
        rates: [],
        reason: 'provider_empty',
        message: PROVIDER_EMPTY_MESSAGE,
      });
    }

    return res.json({
      rates: providerRates,
      reason: 'ok',
      message: '',
    });
  } catch (err) {
    if (err.response || err.request) {
      const biteshipError = err.response?.data;
      console.error('[Shipping Rates] Biteship error:', JSON.stringify(biteshipError ?? err.message));
      const detail = biteshipError?.error ?? biteshipError?.message ?? REQUEST_ERROR_MESSAGE;
      return res.status(502).json({ message: detail });
    }

    console.error('[Shipping Rates] Internal error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
