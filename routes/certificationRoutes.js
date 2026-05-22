const express = require('express');
const router = express.Router();
const Certification = require('../models/Certification');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/certifications
// @desc    Get all certifications
// @access  Public
router.get('/', async (req, res) => {
  try {
    const certifications = await Certification.find().sort({ order: 1 });
    res.json(certifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/certifications
// @desc    Create a certification
// @access  Private
router.post('/', auth, upload.single('icon'), async (req, res) => {
  try {
    const { name, description, order } = req.body;
    const certification = new Certification({
      name,
      description,
      icon: req.file ? `/uploads/${req.file.filename}` : '',
      order: order || 0
    });
    await certification.save();
    res.status(201).json(certification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/certifications/:id
// @desc    Update a certification
// @access  Private
router.put('/:id', auth, upload.single('icon'), async (req, res) => {
  try {
    const certification = await Certification.findById(req.params.id);
    if (!certification) {
      return res.status(404).json({ message: 'Certification not found' });
    }

    const { name, description, order } = req.body;
    if (name) certification.name = name;
    if (description) certification.description = description;
    if (order !== undefined) certification.order = order;
    if (req.file) certification.icon = `/uploads/${req.file.filename}`;

    await certification.save();
    res.json(certification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/certifications/:id
// @desc    Delete a certification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const certification = await Certification.findByIdAndDelete(req.params.id);
    if (!certification) {
      return res.status(404).json({ message: 'Certification not found' });
    }
    res.json({ message: 'Certification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
