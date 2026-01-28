const express = require('express');
const router = express.Router();
const Manufacturing = require('../models/Manufacturing');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// @route   GET /api/manufacturing
// @desc    Get manufacturing section data
// @access  Public
router.get('/', async (req, res) => {
  try {
    let manufacturing = await Manufacturing.findOne();
    if (!manufacturing) {
        // Create default if not exists (using data from current frontend component)
        manufacturing = new Manufacturing({
            tagline: 'Kualitas yang Kami Jaga dari Hulu ke Hilir',
            description: 'Sebagai produsen langsung (direct manufacturer), kami mengawasi setiap detik proses pembuatan. Mulai dari pemintalan benang (Spinning), penjahitan (Sewing), hingga inspeksi ketat (Inspection) untuk memastikan hanya kelembutan terbaik yang menyentuh kulit bayi Anda.',
            features: [
                { title: 'Benang\nberkualitas tinggi', icon: '' },
                { title: 'Penjahitan presisi\noleh tenaga ahli', icon: '' },
                { title: 'Kontrol kualitas\nberlapis', icon: '' }
            ]
        });
        await manufacturing.save();
    }
    res.json(manufacturing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/manufacturing
// @desc    Update manufacturing section
// @access  Private
router.put('/', auth, upload.fields([
    { name: 'icon0', maxCount: 1 },
    { name: 'icon1', maxCount: 1 },
    { name: 'icon2', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 }
]), async (req, res) => {
  console.log('PUT /api/manufacturing hit');
  console.log('Body:', req.body);
  console.log('Files keys:', req.files ? Object.keys(req.files) : 'No files');
  
  try {
    let manufacturing = await Manufacturing.findOne();
    if (!manufacturing) {
        manufacturing = new Manufacturing();
    }

    const { tagline, description } = req.body;
    if (tagline) manufacturing.tagline = tagline;
    if (description) manufacturing.description = description;

    if (req.files && req.files['backgroundImage']) {
        console.log('Updating background image:', req.files['backgroundImage'][0].filename);
        manufacturing.backgroundImage = `/uploads/${req.files['backgroundImage'][0].filename}`;
    }

    // Handle Features
    // We expect titles as title0, title1, title2 in body
    // We expect icons as icon0, icon1, icon2 in files
    
    // Initialize features array if empty or ensure it has 3 slots
    if (!manufacturing.features || manufacturing.features.length === 0) {
        manufacturing.features = [{}, {}, {}];
    } else {
        // Ensure 3 slots
        while (manufacturing.features.length < 3) manufacturing.features.push({});
    }

    for (let i = 0; i < 3; i++) {
        const titleKey = `title${i}`;
        const iconKey = `icon${i}`;

        if (req.body[titleKey]) {
            manufacturing.features[i].title = req.body[titleKey];
        }

        if (req.files && req.files[iconKey]) {
            console.log(`Updating feature ${i} icon:`, req.files[iconKey][0].filename);
            manufacturing.features[i].icon = `/uploads/${req.files[iconKey][0].filename}`;
        }
    }
    
    await manufacturing.save();
    console.log('Manufacturing saved successfully');
    res.json(manufacturing);

  } catch (error) {
    console.error('Error in PUT /api/manufacturing:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
