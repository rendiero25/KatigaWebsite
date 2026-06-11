const express   = require('express');
const router    = express.Router();
const mongoose  = require('mongoose');
const Review    = require('../models/Review');
const auth      = require('../middleware/auth');
const recalc    = require('../services/recalcProductStats');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/admin/reviews?search=&rating=&isVisible=&page=1&limit=20
router.get('/', auth, async (req, res) => {
  try {
    const { search = '', rating, isVisible, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const matchStage = {};
    if (rating) matchStage.rating = Number(rating);
    if (isVisible === 'true')  matchStage.isVisible = true;
    if (isVisible === 'false') matchStage.isVisible = false;

    let pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerDoc',
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: { path: '$customerDoc', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      const rx = escapeRegex(search);
      pipeline.push({
        $match: {
          $or: [
            { 'customerDoc.name': { $regex: rx, $options: 'i' } },
            { 'productDoc.name':  { $regex: rx, $options: 'i' } },
          ],
        },
      });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    const dataPipeline  = [
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $project: {
          rating: 1, comment: 1, photos: 1, isVisible: 1, createdAt: 1,
          'customerDoc.name': 1, 'customerDoc.avatar': 1,
          'productDoc.name': 1, 'productDoc._id': 1,
        },
      },
    ];

    const [countResult, reviews] = await Promise.all([
      Review.aggregate(countPipeline),
      Review.aggregate(dataPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    res.json({ reviews, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/reviews/:id/visibility
router.patch('/:id/visibility', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review tidak ditemukan' });
    review.isVisible = !review.isVisible;
    await review.save();
    await recalc(review.product);
    res.json({ isVisible: review.isVisible });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review tidak ditemukan' });
    await recalc(review.product);
    res.json({ message: 'Review dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
