const { Types } = require('mongoose');
const Review  = require('../models/Review');
const Product = require('../models/Product');

async function recalcProductStats(productId) {
  const oid = new Types.ObjectId(productId);
  const stats = await Review.aggregate([
    { $match: { product: oid, isVisible: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    ratingAvg:   parseFloat((stats[0]?.avg   || 0).toFixed(1)),
    reviewCount: stats[0]?.count || 0,
  });
}

module.exports = recalcProductStats;
