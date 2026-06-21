const express = require('express');
const router = express.Router();
const FooterContent = require('../models/FooterContent');
const auth = require('../middleware/auth');

// @route   GET /api/footer
// @desc    Get footer content
// @access  Public
router.get('/', async (req, res) => {
  try {
    let footer = await FooterContent.findOne();
    if (!footer) {
      footer = await FooterContent.create({});
    }
    res.json(footer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/footer
// @desc    Update footer content
// @access  Private
router.put('/', auth, async (req, res) => {
  try {
    let footer = await FooterContent.findOne();
    if (!footer) {
      footer = new FooterContent({});
    }

    const { consultationTitle, consultationText, copyright } = req.body;
    if (consultationTitle) footer.consultationTitle = consultationTitle;
    if (consultationText) footer.consultationText = consultationText;
    if (copyright) footer.copyright = copyright;

    await footer.save();
    res.json(footer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
