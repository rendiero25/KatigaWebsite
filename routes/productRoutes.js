const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { cloudinary } = upload;

const ProductCategory = require('../models/ProductCategory');
const Promotion = require('../models/Promotion');
const Order = require('../models/Order');

// Form admin hanya mengirim `price` (string). Turunkan angkanya supaya priceNumeric
// tidak tersimpan 0 dan setiap pembaca harga tidak perlu mengurai string sendiri.
const resolvePriceNumeric = (priceNumeric, price) => {
  const explicit = Number(priceNumeric);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const parsed = Number(String(price ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const attachActivePromotions = async (products) => {
  const now = new Date();
  const activePromos = await Promotion.find({
    isVisible: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });

  const promoByProduct = {};
  const promoByCategory = {};
  for (const promo of activePromos) {
    if (promo.type === 'products') {
      for (const pid of promo.productIds) {
        promoByProduct[pid.toString()] = { _id: promo._id, name: promo.name, discountPercent: promo.discountPercent };
      }
    } else if (promo.type === 'category' && promo.categoryId) {
      promoByCategory[promo.categoryId.toString()] = { _id: promo._id, name: promo.name, discountPercent: promo.discountPercent };
    }
  }

  return products.map((p) => {
    const obj = p.toObject();
    obj.activePromotion =
      promoByProduct[p._id.toString()] ||
      promoByCategory[p.category?._id?.toString() ?? ''] ||
      null;
    return obj;
  });
};

const parseUploadedImages = (value) => {
  if (!value) return [];

  const images = JSON.parse(value);
  if (!Array.isArray(images) || !images.every((image) => typeof image === 'string' && image.startsWith('https://res.cloudinary.com/'))) {
    throw new Error('Invalid uploaded image URLs');
  }

  return images;
};

const resolveCoverImage = (coverImage, newImagePaths) => {
  if (!coverImage) return '';

  const newImageMatch = /^__new__(\d+)$/.exec(coverImage);
  if (!newImageMatch) return coverImage;

  return newImagePaths[Number(newImageMatch[1])] || '';
};

const makeCoverFirst = (images, coverImage) => {
  if (!coverImage || !images.includes(coverImage)) return images;
  return [coverImage, ...images.filter((image) => image !== coverImage)];
};

// @route   POST /api/products/upload-signature
// @desc    Create a signed Cloudinary upload payload for an authenticated admin
// @access  Private
router.post('/upload-signature', auth, (req, res) => {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ message: 'Cloudinary upload is not configured' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'katiga';
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret);

  res.json({ apiKey, cloudName, folder, signature, timestamp });
});

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, featured, categories, exclude, limit } = req.query;
    let query = {};

    if (category) {
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(category);
      if (isValidObjectId) {
        query.category = category;
      } else {
        const categoryDoc = await ProductCategory.findOne({
          name: { $regex: new RegExp(`^${category.trim()}$`, 'i') }
        });
        if (categoryDoc) {
          query.category = categoryDoc._id;
        } else {
          return res.json([]);
        }
      }
    }

    if (featured === 'true') query.isFeatured = true;

    if (categories) {
      const catIds = String(categories).split(',').filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
      if (catIds.length) query.category = { $in: catIds };
    }

    if (exclude) {
      const excludeIds = String(exclude).split(',').filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
      if (excludeIds.length) query._id = { $nin: excludeIds };
    }

    const productLimit = limit ? parseInt(String(limit), 10) : 0;
    let productsQuery = Product.find(query).populate('category');
    if (productLimit > 0) productsQuery = productsQuery.limit(productLimit);
    const products = await productsQuery;

    res.json(await attachActivePromotions(products));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/best-sellers
// @desc    Products ranked by paid quantity sold; falls back to featured products
//          when there are no paid orders yet.
// @access  Public
// NOTE: must stay above GET /:id, otherwise "best-sellers" is read as an id.
router.get('/best-sellers', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '4'), 10) || 4, 1), 12);

    const ranked = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', quantity: { $sum: '$items.quantity' } } },
      { $sort: { quantity: -1 } },
      { $limit: limit },
    ]);

    const rankedIds = ranked.map((row) => row._id).filter(Boolean);
    let products = rankedIds.length
      ? await Product.find({ _id: { $in: rankedIds } }).populate('category')
      : [];

    // Keep the aggregation's ordering — find() does not preserve $in order.
    const soldByProduct = new Map(ranked.map((row) => [String(row._id), row.quantity]));
    products.sort(
      (a, b) => (soldByProduct.get(String(b._id)) ?? 0) - (soldByProduct.get(String(a._id)) ?? 0)
    );

    if (products.length < limit) {
      const already = new Set(products.map((p) => String(p._id)));
      const filler = await Product.find({ _id: { $nin: [...already] } })
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(limit - products.length)
        .populate('category');
      products = [...products, ...filler];
    }

    const result = await attachActivePromotions(products);
    res.json(
      result.map((product) => ({
        ...product,
        soldQuantity: soldByProduct.get(String(product._id)) ?? 0,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = await Product.findById(req.params.id).populate('category');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const now = new Date();
    const activePromos = await Promotion.find({
      isVisible: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    const obj = product.toObject();
    const promo = activePromos.find(p =>
      (p.type === 'products' && p.productIds.some(pid => pid.toString() === product._id.toString())) ||
      (p.type === 'category' && p.categoryId?.toString() === product.category?._id?.toString())
    );
    obj.activePromotion = promo
      ? { _id: promo._id, name: promo.name, discountPercent: promo.discountPercent }
      : null;

    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/products
// @desc    Create a product
// @access  Private
router.post('/', auth, upload.any(), async (req, res) => {
  try {
    const { name, description, category, price, priceNumeric, weightGrams, dimensionLength, dimensionWidth, dimensionHeight, link, linkTokopedia, linkShopee, isFeatured, variants, stock, coverImage } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Nama produk wajib diisi' });
    }

    if (!category || !/^[0-9a-fA-F]{24}$/.test(category)) {
      return res.status(400).json({ message: 'Kategori produk wajib dipilih' });
    }

    let imageFiles = req.files || [];
    const imagePaths = [...imageFiles.map(file => file.path), ...parseUploadedImages(req.body.uploadedImages)];
    const orderedImagePaths = makeCoverFirst(
      imagePaths,
      resolveCoverImage(coverImage, imagePaths)
    );
    const primaryImage = orderedImagePaths.length > 0 ? orderedImagePaths[0] : '';

    let parsedVariants = variants ? JSON.parse(variants) : [];
    parsedVariants = parsedVariants.map(v => {
      if (v.image && v.image.startsWith('__new__')) {
        const idx = parseInt(v.image.replace('__new__', ''), 10);
        v.image = imagePaths[idx] || '';
      }
      return v;
    });

    const product = new Product({
      name,
      description,
      category,
      price,
      priceNumeric: resolvePriceNumeric(priceNumeric, price),
      weightGrams: Number(weightGrams) || 0,
      dimensions: {
        length: Number(dimensionLength) || 1,
        width:  Number(dimensionWidth) || 1,
        height: Number(dimensionHeight) || 1
      },
      link,
      linkTokopedia,
      linkShopee,
      isFeatured: isFeatured === 'true',
      stock: Number(stock) || 0,
      image: primaryImage,
      images: orderedImagePaths,
      variants: parsedVariants
    });
    await product.save();
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
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { name, description, category, price, priceNumeric, weightGrams, dimensionLength, dimensionWidth, dimensionHeight, link, linkTokopedia, linkShopee, isFeatured, keptImages, variants, stock, coverImage } = req.body;

    if (category !== undefined && !/^[0-9a-fA-F]{24}$/.test(category)) {
      return res.status(400).json({ message: 'Kategori produk wajib dipilih' });
    }

    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = price;
    if (price !== undefined || priceNumeric !== undefined) {
      product.priceNumeric = resolvePriceNumeric(priceNumeric, price ?? product.price);
    }
    if (weightGrams !== undefined) product.weightGrams = Number(weightGrams) || 0;
    if (dimensionLength !== undefined || dimensionWidth !== undefined || dimensionHeight !== undefined) {
      product.dimensions = {
        length: Number(dimensionLength) || product.dimensions?.length || 1,
        width:  Number(dimensionWidth)  || product.dimensions?.width  || 1,
        height: Number(dimensionHeight) || product.dimensions?.height || 1
      };
    }
    if (link) product.link = link;
    if (linkTokopedia !== undefined) product.linkTokopedia = linkTokopedia;
    if (linkShopee !== undefined) product.linkShopee = linkShopee;
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true';
    if (stock !== undefined) product.stock = Number(stock) || 0;

    // Handle images first so newImagePaths is available for variant resolution
    let currentImages = [];
    if (keptImages) {
        if (Array.isArray(keptImages)) {
            currentImages = keptImages;
        } else {
            currentImages = [keptImages];
        }
    }

    let imageFiles = req.files || [];
    const newImagePaths = [...imageFiles.map(file => file.path), ...parseUploadedImages(req.body.uploadedImages)];

    const finalImages = makeCoverFirst(
      [...currentImages, ...newImagePaths],
      resolveCoverImage(coverImage, newImagePaths)
    );
    product.images = finalImages;

    if (finalImages.length > 0) {
        product.image = finalImages[0];
    } else {
        product.image = '';
    }

    if (variants !== undefined) {
      let parsedVariants = JSON.parse(variants);
      parsedVariants = parsedVariants.map(v => {
        if (v.image && v.image.startsWith('__new__')) {
          const idx = parseInt(v.image.replace('__new__', ''), 10);
          v.image = newImagePaths[idx] || '';
        }
        return v;
      });
      product.variants = parsedVariants;
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
