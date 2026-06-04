const express = require('express');
const router = express.Router();
const HeroSection = require('../models/HeroSection');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/hero
// @desc    Get hero section
// @access  Public
router.get('/', async (req, res) => {
  try {
    let hero = await HeroSection.findOne();
    res.json(hero || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/hero
// @desc    Update hero section
// @access  Private
router.put('/', auth, upload.single('image'), async (req, res) => {
  try {
    let hero = await HeroSection.findOne();
    
    const { title, subtitle, buttonName, buttonLink } = req.body;

    if (!hero) {
      hero = new HeroSection({
        image: req.file ? req.file.path : '',
        title: title || '',
        subtitle: subtitle || '',
        buttonName: buttonName || '',
        buttonLink: buttonLink || ''
      });
    } else {
      if (title) hero.title = title;
      if (subtitle) hero.subtitle = subtitle;
      if (buttonName) hero.buttonName = buttonName;
      if (buttonLink) hero.buttonLink = buttonLink;
      if (req.file) hero.image = req.file.path;
    }

    await hero.save();
    res.json(hero);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
