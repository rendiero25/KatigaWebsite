const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const ProductCategory = require('../models/ProductCategory');

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = {};
    
    if (category) {
      // Check if category is a valid ObjectId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(category);
      
      if (isValidObjectId) {
        query.category = category;
      } else {
        // If not ID, try to find category by name (case-insensitive)
        const categoryDoc = await ProductCategory.findOne({ 
          name: { $regex: new RegExp(`^${category}$`, 'i') } 
        });
        
        if (categoryDoc) {
          query.category = categoryDoc._id;
        } else {
          // Category name provided but not found -> return empty, or maybe return all?
          // If filtering by specific non-existent category, result should be empty.
          return res.json([]);
        }
      }
    }

    if (featured === 'true') query.isFeatured = true;

    const products = await Product.find(query).populate('category');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/products
// @desc    Create a product
// @access  Private
router.post('/', auth, upload.single('image'), async (req, res) => {
  console.log('POST /api/products hit');
  console.log('Body:', req.body);
  console.log('File:', req.file);
  try {
    const { name, description, category, price, link, isFeatured } = req.body;
    const product = new Product({
      name,
      description,
      category,
      price,
      link,
      isFeatured: isFeatured === 'true',
      image: req.file ? `/uploads/${req.file.filename}` : ''
    });
    await product.save();
    console.log('Product saved:', product);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { name, description, category, price, link, isFeatured } = req.body;
    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = price;
    if (link) product.link = link;
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true';
    if (req.file) product.image = `/uploads/${req.file.filename}`;

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
