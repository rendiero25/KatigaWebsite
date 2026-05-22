const express = require('express');
const router = express.Router();
const ContactPage = require('../models/ContactPage');
const auth = require('../middleware/auth');

// @route   GET /api/contact-page
// @desc    Get contact page content
// @access  Public
router.get('/', async (req, res) => {
  try {
    let settings = await ContactPage.findOne();
    if (!settings) {
      settings = await ContactPage.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/contact-page
// @desc    Update contact page content
// @access  Private
router.put('/', auth, async (req, res) => {
  try {
    let settings = await ContactPage.findOne();
    if (!settings) {
      settings = new ContactPage({});
    }

    const { title, subtitle1, subtitle2 } = req.body;
    if (title) settings.title = title;
    if (subtitle1) settings.subtitle1 = subtitle1;
    if (subtitle2) settings.subtitle2 = subtitle2;

    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
