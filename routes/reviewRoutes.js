const express      = require('express');
const router       = express.Router();
const mongoose     = require('mongoose');
const Review       = require('../models/Review');
const Order        = require('../models/Order');
const customerAuth = require('../middleware/customerAuth');
const upload       = require('../middleware/upload');
const recalc       = require('../services/recalcProductStats');
const { notifyAdmin } = require('../utils/notify');

// GET /api/reviews/can-review?productId=&orderId=
router.get('/can-review', customerAuth, async (req, res) => {
  try {
    const { productId, orderId } = req.query;
    if (!productId || !orderId) return res.status(400).json({ message: 'productId and orderId required' });

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(orderId))
      return res.status(400).json({ message: 'productId and orderId tidak valid' });

    const order = await Order.findOne({
      _id: orderId,
      customer: req.customer._id,
      orderStatus: 'delivered',
      paymentStatus: 'paid',
    });
    if (!order) return res.json({ canReview: false, alreadyReviewed: false });

    const hasItem = order.items.some(
      (item) => item.product && item.product.toString() === productId
    );
    if (!hasItem) return res.json({ canReview: false, alreadyReviewed: false });

    const existing = await Review.findOne({
      customer: req.customer._id,
      order: orderId,
      product: productId,
    });

    res.json({ canReview: !existing, alreadyReviewed: !!existing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reviews/my?page=1&limit=10
router.get('/my', customerAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const query = { customer: req.customer._id };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('product', 'name image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
    ]);

    res.json({ reviews, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reviews/product/:productId?page=1&limit=10
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId))
      return res.status(400).json({ message: 'Invalid productId' });

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const query = { product: productId, isVisible: true };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('customer', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
    ]);

    // Rating distribution: count per star 1-5
    const distAgg = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isVisible: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distAgg.forEach((d) => { ratingDistribution[d._id] = d.count; });

    const avgAgg = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isVisible: true } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);
    const ratingAvg = parseFloat((avgAgg[0]?.avg || 0).toFixed(1));

    res.json({ reviews, total, page, pages: Math.ceil(total / limit), ratingAvg, ratingDistribution });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/reviews
router.post('/', customerAuth, upload.array('photos', 5), async (req, res) => {
  try {
    const { productId, orderId, rating, comment } = req.body;

    if (!productId || !orderId || !rating)
      return res.status(400).json({ message: 'productId, orderId, dan rating wajib diisi' });

    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)
      return res.status(400).json({ message: 'Rating harus antara 1 dan 5' });

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(orderId))
      return res.status(400).json({ message: 'ID tidak valid' });

    // Verify order delivered and contains product
    const order = await Order.findOne({
      _id: orderId,
      customer: req.customer._id,
      orderStatus: 'delivered',
      paymentStatus: 'paid',
    });
    if (!order) return res.status(403).json({ message: 'Pesanan tidak ditemukan atau belum selesai' });

    const hasItem = order.items.some(
      (item) => item.product && item.product.toString() === productId
    );
    if (!hasItem) return res.status(403).json({ message: 'Produk tidak ada di pesanan ini' });

    // Check no existing review
    const existing = await Review.findOne({
      customer: req.customer._id,
      order: orderId,
      product: productId,
    });
    if (existing) return res.status(409).json({ message: 'Kamu sudah mengulas produk ini untuk pesanan ini' });

    const photos = (req.files || []).map((f) => f.secure_url || f.path);

    const review = await Review.create({
      product:  productId,
      customer: req.customer._id,
      order:    orderId,
      rating:   ratingNum,
      comment:  (comment || '').slice(0, 1000),
      photos,
    });

    await recalc(new mongoose.Types.ObjectId(productId));

    const populated = await review.populate('customer', 'name avatar');

    try {
      await notifyAdmin({
        type: 'review_new',
        title: 'Ulasan baru',
        message: `${req.customer.name} memberi rating ${ratingNum} untuk produk`,
        link: '/admin/reviews',
        relatedId: review._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] review_new failed:', notifyErr.message);
    }

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Kamu sudah mengulas produk ini untuk pesanan ini' });
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
