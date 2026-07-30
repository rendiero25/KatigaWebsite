const express = require('express');
const router = express.Router();
const ShopTheLook = require('../models/ShopTheLook');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const PRODUCT_POPULATE_FIELDS = 'name image images priceNumeric price';

// @route   GET /api/shop-the-look
// @desc    Get the most recent active Shop the Look document
// @access  Public
router.get('/', async (req, res) => {
  try {
    const look = await ShopTheLook.findOne({ active: true })
      .sort({ createdAt: -1 })
      .populate('hotspots.product', PRODUCT_POPULATE_FIELDS);

    res.json(look || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/shop-the-look/admin/latest
// @desc    Get the most recent Shop the Look document regardless of active status
// @access  Private
router.get('/admin/latest', auth, async (req, res) => {
  try {
    const look = await ShopTheLook.findOne()
      .sort({ createdAt: -1 })
      .populate('hotspots.product', PRODUCT_POPULATE_FIELDS);

    res.json(look || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/shop-the-look
// @desc    Create a Shop the Look document
// @access  Private
// Body: multipart/form-data — title, active, hotspots (JSON string), image (file)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, active, hotspots } = req.body;

    let parsedHotspots = [];
    if (hotspots) {
      try {
        parsedHotspots = JSON.parse(hotspots);
      } catch {
        return res.status(400).json({ message: 'Format hotspots tidak valid' });
      }
      if (!Array.isArray(parsedHotspots)) {
        return res.status(400).json({ message: 'hotspots harus berupa array' });
      }
    }

    const look = new ShopTheLook({
      title: title || '',
      image: req.file ? req.file.path : '',
      active: active === undefined ? true : active === 'true' || active === true,
      hotspots: parsedHotspots
    });

    await look.save();
    await look.populate('hotspots.product', PRODUCT_POPULATE_FIELDS);
    res.status(201).json(look);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/shop-the-look/:id
// @desc    Update a Shop the Look document
// @access  Private
// Body: multipart/form-data — title, active, hotspots (JSON string), image (file, optional)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const look = await ShopTheLook.findById(req.params.id);
    if (!look) {
      return res.status(404).json({ message: 'Shop the Look not found' });
    }

    const { title, active, hotspots } = req.body;

    if (title !== undefined) look.title = title;
    if (active !== undefined) look.active = active === 'true' || active === true;

    if (hotspots !== undefined) {
      let parsedHotspots;
      try {
        parsedHotspots = JSON.parse(hotspots);
      } catch {
        return res.status(400).json({ message: 'Format hotspots tidak valid' });
      }
      if (!Array.isArray(parsedHotspots)) {
        return res.status(400).json({ message: 'hotspots harus berupa array' });
      }
      look.hotspots = parsedHotspots;
    }

    if (req.file) {
      look.image = req.file.path;
    }

    await look.save();
    await look.populate('hotspots.product', PRODUCT_POPULATE_FIELDS);
    res.json(look);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/shop-the-look/:id
// @desc    Delete a Shop the Look document
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const look = await ShopTheLook.findByIdAndDelete(req.params.id);
    if (!look) {
      return res.status(404).json({ message: 'Shop the Look not found' });
    }
    res.json({ message: 'Shop the Look deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
