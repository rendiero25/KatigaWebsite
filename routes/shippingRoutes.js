const express = require('express');
const router = express.Router();
const customerAuth = require('../middleware/customerAuth');
const { searchAreas, getRates } = require('../services/biteshipService');

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
  try {
    const { destinationAreaId, items } = req.body;
    if (!destinationAreaId || !items?.length) {
      return res.status(400).json({ message: 'destinationAreaId dan items wajib diisi' });
    }
    const rates = await getRates({ destinationAreaId, items });
    res.json(rates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
