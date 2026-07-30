const express = require('express');
const router = express.Router();
const ProductCategory = require('../models/ProductCategory');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await ProductCategory.find().sort({ displayOrder: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/categories
// @desc    Create a category
// @access  Private
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, slug, displayOrder, featured } = req.body;
    const category = new ProductCategory({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      image: req.file ? req.file.path : '',
      displayOrder: displayOrder !== undefined ? Number(displayOrder) || 0 : 0,
      featured: featured === 'true' || featured === true
    });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const category = await ProductCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const { name, slug, displayOrder, featured, keptImage } = req.body;
    if (name) category.name = name;
    if (slug) category.slug = slug;
    if (displayOrder !== undefined) category.displayOrder = Number(displayOrder) || 0;
    if (featured !== undefined) category.featured = featured === 'true' || featured === true;

    if (req.file) {
      category.image = req.file.path;
    } else if (keptImage !== undefined && keptImage === '') {
      category.image = '';
    }

    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete a category
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const category = await ProductCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
