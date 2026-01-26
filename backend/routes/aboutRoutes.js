const express = require('express');
const router = express.Router();
const AboutContent = require('../models/AboutContent');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/about
// @desc    Get all about content
// @access  Public
router.get('/', async (req, res) => {
  try {
    const aboutContent = await AboutContent.find();
    res.json(aboutContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/about/:section
// @desc    Get about content by section
// @access  Public
router.get('/:section', async (req, res) => {
  try {
    const content = await AboutContent.findOne({ section: req.params.section });
    res.json(content || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/about
// @desc    Create about content
// @access  Private
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    const { section, title, content } = req.body;
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    const aboutContent = new AboutContent({
      section,
      title,
      content,
      images
    });
    await aboutContent.save();
    res.status(201).json(aboutContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/about/:id
// @desc    Update about content
// @access  Private
router.put('/:id', auth, upload.array('images', 5), async (req, res) => {
  try {
    const aboutContent = await AboutContent.findById(req.params.id);
    if (!aboutContent) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const { section, title, content } = req.body;
    if (section) aboutContent.section = section;
    if (title) aboutContent.title = title;
    if (content) aboutContent.content = content;
    if (req.files && req.files.length > 0) {
      aboutContent.images = req.files.map(file => `/uploads/${file.filename}`);
    }

    await aboutContent.save();
    res.json(aboutContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/about/:id
// @desc    Delete about content
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const content = await AboutContent.findByIdAndDelete(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json({ message: 'Content deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
