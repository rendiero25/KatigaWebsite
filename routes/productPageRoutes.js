const express = require('express');
const router = express.Router();
const ProductPage = require('../models/ProductPage');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get Product Page Settings
router.get('/', async (req, res) => {
  try {
    let settings = await ProductPage.findOne();
    if (!settings) {
      settings = new ProductPage();
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update Product Page Settings
router.put('/', [auth, upload.single('bannerImage')], async (req, res) => {
  try {
    let settings = await ProductPage.findOne();
    if (!settings) {
      settings = new ProductPage();
    }

    const {
      subtitle,
      title,
      cat1Name,
      cat1Subtitle,
      cat1Title,
      cat2Name,
      cat2Subtitle,
      cat2Title
    } = req.body;

    if (subtitle) settings.subtitle = subtitle;
    if (title) settings.title = title;
    
    if (req.file) {
      settings.bannerImage = req.file.path;
    }

    // Update Category 1
    if (cat1Name) settings.category1.name = cat1Name;
    if (cat1Subtitle) settings.category1.subtitle = cat1Subtitle;
    if (cat1Title) settings.category1.title = cat1Title;

    // Update Category 2
    if (cat2Name) settings.category2.name = cat2Name;
    if (cat2Subtitle) settings.category2.subtitle = cat2Subtitle;
    if (cat2Title) settings.category2.title = cat2Title;

    await settings.save();
    res.json(settings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
