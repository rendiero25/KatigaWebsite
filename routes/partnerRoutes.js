const express = require('express');
const router = express.Router();
const Partner = require('../models/Partner');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/partners
// @desc    Get all partners
// @access  Public
router.get('/', async (req, res) => {
  try {
    const partners = await Partner.find().sort({ order: 1 });
    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/partners
// @desc    Create a partner
// @access  Private
router.post('/', auth, upload.single('logo'), async (req, res) => {
  try {
    const { name, order } = req.body;
    const partner = new Partner({
      name,
      logo: req.file ? req.file.path : '',
      order: order || 0
    });
    await partner.save();
    res.status(201).json(partner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/partners/:id
// @desc    Update a partner
// @access  Private
router.put('/:id', auth, upload.single('logo'), async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    const { name, order } = req.body;
    if (name) partner.name = name;
    if (order !== undefined) partner.order = order;
    if (req.file) partner.logo = req.file.path;

    await partner.save();
    res.json(partner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/partners/:id
// @desc    Delete a partner
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }
    res.json({ message: 'Partner deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
