const express = require('express');
const router = express.Router();
const Advantage = require('../models/Advantage');
const auth = require('../middleware/auth');

// @route   GET /api/advantages
// @desc    Get all advantages
// @access  Public
const AdvantagesSection = require('../models/AdvantagesSection');

// @route   GET /api/advantages/content
// @desc    Get advantages section content
// @access  Public
router.get('/content', async (req, res) => {
  try {
    let content = await AdvantagesSection.findOne();
    if (!content) {
        content = new AdvantagesSection();
        await content.save();
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/advantages/content
// @desc    Update advantages section content
// @access  Private
router.put('/content', auth, async (req, res) => {
  try {
    let content = await AdvantagesSection.findOne();
    if (!content) {
        content = new AdvantagesSection();
    }
    
    const { title, subtitle, content: sectionContent } = req.body;
    if (title) content.title = title;
    if (subtitle) content.subtitle = subtitle;
    if (sectionContent) content.content = sectionContent;

    await content.save();
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const advantages = await Advantage.find().sort({ order: 1 });
    res.json(advantages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/advantages
// @desc    Create an advantage
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { number, title, description, order } = req.body;
    const advantage = new Advantage({
      number,
      title,
      description,
      order: order || 0
    });
    await advantage.save();
    res.status(201).json(advantage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/advantages/:id
// @desc    Update an advantage
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const advantage = await Advantage.findById(req.params.id);
    if (!advantage) {
      return res.status(404).json({ message: 'Advantage not found' });
    }

    const { number, title, description, order } = req.body;
    if (number) advantage.number = number;
    if (title) advantage.title = title;
    if (description) advantage.description = description;
    if (order !== undefined) advantage.order = order;

    await advantage.save();
    res.json(advantage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/advantages/:id
// @desc    Delete an advantage
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const advantage = await Advantage.findByIdAndDelete(req.params.id);
    if (!advantage) {
      return res.status(404).json({ message: 'Advantage not found' });
    }
    res.json({ message: 'Advantage deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
