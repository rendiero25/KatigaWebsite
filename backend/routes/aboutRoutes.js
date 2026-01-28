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

// @route   GET /api/about
// @desc    Get about content (Singleton)
// @access  Public
router.get('/', async (req, res) => {
  try {
    let aboutContent = await AboutContent.findOne();
    if (!aboutContent) {
        // Create default if not exists
        aboutContent = new AboutContent({});
        await aboutContent.save();
    }
    res.json(aboutContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/about
// @desc    Update about content (Singleton)
// @access  Private
router.put('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    let aboutContent = await AboutContent.findOne();
    if (!aboutContent) {
        aboutContent = new AboutContent({});
    }

    const { title, subtitle, history, missionPoints, visionContent } = req.body;
    
    if (title !== undefined) aboutContent.title = title;
    if (subtitle !== undefined) aboutContent.subtitle = subtitle;
    if (history !== undefined) aboutContent.history = history;
    if (visionContent !== undefined) aboutContent.vision = { ...aboutContent.vision, content: visionContent };
    
    if (missionPoints) {
        // Expecting missionPoints to be JSON string of array if sent via FormData
        try {
            const parsedPoints = JSON.parse(missionPoints);
            if (Array.isArray(parsedPoints)) {
                aboutContent.mission = { ...aboutContent.mission, points: parsedPoints };
            }
        } catch (e) {
            console.error("Error parsing mission points", e);
        }
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      // Append new images or replace? Usually for gallery we might want to append or allow managing. 
      // For now, let's just append up to max 10 total? Or just add all new ones.
      // User requirement: "Images (Upload max 10 image)". 
      // I'll stick to appending for now, frontend can handle deletion via another endpoint strictly for images if needed, or simple replacement logic. 
      // Let's assume this PUT adds images.
      aboutContent.images = [...aboutContent.images, ...newImages].slice(0, 10);
    }

    await aboutContent.save();
    res.json(aboutContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper route to clear images if needed or delete specific image
router.put('/images/delete', auth, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        let aboutContent = await AboutContent.findOne();
        if (aboutContent) {
            aboutContent.images = aboutContent.images.filter(img => img !== imageUrl);
            await aboutContent.save();
        }
        res.json(aboutContent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
