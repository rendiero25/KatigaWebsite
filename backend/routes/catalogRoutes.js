const express = require('express');
const router = express.Router();
const Catalog = require('../models/Catalog');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/catalog
// @desc    Get catalog content
// @access  Public
router.get('/', async (req, res) => {
  try {
    let catalog = await Catalog.findOne();
    res.json(catalog || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/catalog
// @desc    Update catalog content
// @access  Private
router.put('/', auth, upload.fields([
  { name: 'backgroundImage', maxCount: 1 },
  { name: 'cardImage', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]), async (req, res) => {
  try {
    let catalog = await Catalog.findOne();
    
    const { title, description } = req.body;

    if (!catalog) {
      catalog = new Catalog({
        title: title || '',
        description: description || '',
        backgroundImage: req.files?.backgroundImage ? `/uploads/${req.files.backgroundImage[0].filename}` : '',
        cardImage: req.files?.cardImage ? `/uploads/${req.files.cardImage[0].filename}` : '',
        fileUrl: req.files?.file ? `/uploads/${req.files.file[0].filename}` : ''
      });
    } else {
      if (title) catalog.title = title;
      if (description) catalog.description = description;
      if (req.files?.backgroundImage) catalog.backgroundImage = `/uploads/${req.files.backgroundImage[0].filename}`;
      if (req.files?.cardImage) catalog.cardImage = `/uploads/${req.files.cardImage[0].filename}`;
      if (req.files?.file) catalog.fileUrl = `/uploads/${req.files.file[0].filename}`;
    }

    await catalog.save();
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
