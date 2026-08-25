const express = require('express');
const router = express.Router();
const SiteSettings = require('../models/SiteSettings');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/site-settings
// @desc    Get site settings
// @access  Public
router.get('/', async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/site-settings
// @desc    Update site settings
// @access  Private
router.put('/', auth, upload.single('logo'), async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings({});
    }

    const { companyName, tagline, shopNowUrl, tokopediaUrl, shopeeUrl, instagramUrl, tiktokUrl } = req.body;

    // Dicek terhadap undefined, bukan truthy: dengan cek truthy sebuah field tidak
    // pernah bisa dikosongkan lagi lewat form karena '' dianggap "tidak dikirim".
    if (companyName !== undefined) settings.companyName = companyName;
    if (tagline !== undefined) settings.tagline = tagline;
    if (shopNowUrl !== undefined) settings.shopNowUrl = shopNowUrl;
    if (tokopediaUrl !== undefined) settings.tokopediaUrl = tokopediaUrl;
    if (shopeeUrl !== undefined) settings.shopeeUrl = shopeeUrl;
    if (instagramUrl !== undefined) settings.instagramUrl = instagramUrl;
    if (tiktokUrl !== undefined) settings.tiktokUrl = tiktokUrl;
    if (req.file) settings.logo = req.file.path;

    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
