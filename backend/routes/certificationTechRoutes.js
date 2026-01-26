const express = require('express');
const router = express.Router();
const CertificationTechnology = require('../models/CertificationTechnology');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/certification-tech
// @desc    Get certification technology content
// @access  Public
router.get('/', async (req, res) => {
  try {
    let content = await CertificationTechnology.findOne();
    res.json(content || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/certification-tech
// @desc    Update certification technology content
// @access  Private
router.put('/', auth, upload.single('image'), async (req, res) => {
  try {
    let content = await CertificationTechnology.findOne();
    
    const { title, content: textContent, points } = req.body;

    if (!content) {
      content = new CertificationTechnology({
        title: title || '',
        content: textContent || '',
        points: points ? JSON.parse(points) : [],
        image: req.file ? `/uploads/${req.file.filename}` : ''
      });
    } else {
      if (title) content.title = title;
      if (textContent) content.content = textContent;
      if (points) content.points = JSON.parse(points);
      if (req.file) content.image = `/uploads/${req.file.filename}`;
    }

    await content.save();
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
