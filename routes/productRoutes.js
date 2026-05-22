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
          name: { $regex: new RegExp(`^${category.trim()}$`, 'i') } 
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
router.post('/', auth, upload.any(), async (req, res) => {
  console.log('POST /api/products hit');
  console.log('Body:', req.body);
  console.log('Files:', req.files); // Debug log
  try {
    const { name, description, category, price, link, linkTokopedia, linkShopee, isFeatured } = req.body;
    
    // Manual filtering: prefer 'images' field but fallback to all files if necessary
    // This robustness helps avoid "Unexpected field" errors from multer strictness
    let imageFiles = req.files || [];
    // Optionally filter: imageFiles = req.files.filter(f => f.fieldname === 'images');
    
    const imagePaths = imageFiles.map(file => `/uploads/${file.filename}`);
    
    // Primary image is the first one, or empty string
    const primaryImage = imagePaths.length > 0 ? imagePaths[0] : '';
    
    console.log('Using image paths:', imagePaths);

    const product = new Product({
      name,
      description,
      category,
      price,
      link,
      linkTokopedia,
      linkShopee,
      isFeatured: isFeatured === 'true',
      image: primaryImage,
      images: imagePaths
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
router.put('/:id', auth, upload.any(), async (req, res) => {
  console.log('PUT /api/products/:id hit');
  console.log('Files:', req.files);
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { name, description, category, price, link, linkTokopedia, linkShopee, isFeatured, keptImages } = req.body;
    
    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = price;
    if (link) product.link = link;
    if (linkTokopedia !== undefined) product.linkTokopedia = linkTokopedia;
    if (linkShopee !== undefined) product.linkShopee = linkShopee;
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true';

    // Handle images
    // keptImages might be a string (if 1) or array (if multiple) or undefined
    let currentImages = [];
    if (keptImages) {
        if (Array.isArray(keptImages)) {
            currentImages = keptImages;
        } else {
            currentImages = [keptImages];
        }
    }

    // Add new images
    let imageFiles = req.files || [];
    const newImagePaths = imageFiles.map(file => `/uploads/${file.filename}`);
    
    const finalImages = [...currentImages, ...newImagePaths];
    product.images = finalImages;
    
    // Update primary image (first one)
    if (finalImages.length > 0) {
        product.image = finalImages[0];
    } else {
        product.image = '';
    }

    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Error in PUT /api/products:', error);
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
