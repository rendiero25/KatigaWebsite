const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');

function getDateFilter(range) {
  const now = new Date();
  let start;
  switch (range) {
    case '7d':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
      return {};
    case '30d':
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
  }
  return { createdAt: { $gte: start } };
}

function toCountRecord(rows) {
  return rows.reduce((acc, r) => ({ ...acc, [r._id ?? 'unknown']: r.count }), {});
}

// ─── GET /api/reports/summary — admin: revenue/sales report ───
router.get('/summary', auth, async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const dateFilter = getDateFilter(range);
    const trendFormat = range === 'year' || range === 'all' ? '%Y-%m' : '%Y-%m-%d';

    const [result] = await Order.aggregate([
      {
        $facet: {
          revenue: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
          ],
          trend: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            {
              $group: {
                _id: { $dateToString: { format: trendFormat, date: '$createdAt' } },
                revenue: { $sum: '$total' },
              },
            },
            { $sort: { _id: 1 } },
          ],
          paymentStatusCounts: [
            { $match: dateFilter },
            { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
          ],
          orderStatusCounts: [
            { $match: dateFilter },
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
          ],
          topProducts: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                name: { $first: '$items.name' },
                revenue: { $sum: '$items.subtotal' },
                quantity: { $sum: '$items.quantity' },
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
          ],
          paymentTypeCounts: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $group: { _id: '$midtransPaymentType', count: { $sum: 1 } } },
          ],
          courierCounts: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $group: { _id: '$shippingServiceName', count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    const newCustomersCount = await Customer.countDocuments(
      dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}
    );

    res.json({
      totalRevenue: result.revenue[0]?.total ?? 0,
      orderCount: result.revenue[0]?.count ?? 0,
      trend: result.trend.map((t) => ({ date: t._id, revenue: t.revenue })),
      paymentStatusCounts: toCountRecord(result.paymentStatusCounts),
      orderStatusCounts: toCountRecord(result.orderStatusCounts),
      topProducts: result.topProducts.map((p) => ({
        productId: p._id?.toString() ?? '',
        name: p.name,
        revenue: p.revenue,
        quantity: p.quantity,
      })),
      paymentTypeCounts: toCountRecord(result.paymentTypeCounts),
      courierCounts: toCountRecord(result.courierCounts),
      newCustomersCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/reports/products — admin: product performance report ───
router.get('/products', auth, async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const dateFilter = getDateFilter(range);

    const [result] = await Order.aggregate([
      {
        $facet: {
          topByRevenue: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                name: { $first: '$items.name' },
                revenue: { $sum: '$items.subtotal' },
                quantity: { $sum: '$items.quantity' },
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 },
          ],
          topByQuantity: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                name: { $first: '$items.name' },
                revenue: { $sum: '$items.subtotal' },
                quantity: { $sum: '$items.quantity' },
              },
            },
            { $sort: { quantity: -1 } },
            { $limit: 10 },
          ],
          soldProductIds: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $unwind: '$items' },
            { $group: { _id: '$items.product' } },
          ],
          categoryPerformance: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $unwind: '$items' },
            {
              $lookup: {
                from: Product.collection.name,
                localField: 'items.product',
                foreignField: '_id',
                as: 'p',
              },
            },
            { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: '$p.category',
                revenue: { $sum: '$items.subtotal' },
                quantity: { $sum: '$items.quantity' },
              },
            },
            {
              $lookup: {
                from: ProductCategory.collection.name,
                localField: '_id',
                foreignField: '_id',
                as: 'c',
              },
            },
            { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                categoryId: '$_id',
                name: { $ifNull: ['$c.name', 'Tanpa Kategori'] },
                revenue: 1,
                quantity: 1,
              },
            },
            { $sort: { revenue: -1 } },
          ],
        },
      },
    ]);

    const soldIds = result.soldProductIds.map((r) => r._id).filter(Boolean);
    const [unsoldProducts, unsoldCount, topRated] = await Promise.all([
      Product.find({ _id: { $nin: soldIds } })
        .select('name image ratingAvg reviewCount')
        .limit(10),
      Product.countDocuments({ _id: { $nin: soldIds } }),
      Product.find().sort({ reviewCount: -1 }).select('name image ratingAvg reviewCount').limit(10),
    ]);

    const mapProductRow = (p) => ({
      productId: p._id?.toString() ?? '',
      name: p.name,
      revenue: p.revenue,
      quantity: p.quantity,
    });

    res.json({
      topByRevenue: result.topByRevenue.map(mapProductRow),
      topByQuantity: result.topByQuantity.map(mapProductRow),
      unsoldProducts: unsoldProducts.map((p) => ({
        productId: p._id.toString(),
        name: p.name,
        image: p.image,
        ratingAvg: p.ratingAvg,
        reviewCount: p.reviewCount,
      })),
      unsoldCount,
      topRated: topRated.map((p) => ({
        productId: p._id.toString(),
        name: p.name,
        image: p.image,
        ratingAvg: p.ratingAvg,
        reviewCount: p.reviewCount,
      })),
      categoryPerformance: result.categoryPerformance.map((c) => ({
        categoryId: c.categoryId?.toString() ?? null,
        name: c.name,
        revenue: c.revenue,
        quantity: c.quantity,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/reports/customers — admin: customer insights report ───
router.get('/customers', auth, async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const dateFilter = getDateFilter(range);

    const [totalRegistered, newCustomers, suspendedCount] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
      Customer.countDocuments({ suspended: true }),
    ]);

    const topSpenders = await Order.aggregate([
      { $match: { paymentStatus: 'paid', ...dateFilter } },
      { $group: { _id: '$customer', total: { $sum: '$total' }, orderCount: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: Customer.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'c',
        },
      },
      { $unwind: '$c' },
      {
        $project: {
          customerId: '$_id',
          name: '$c.name',
          email: '$c.email',
          total: 1,
          orderCount: 1,
        },
      },
    ]);

    let newBuyers = null;
    let returningBuyers = null;
    const rangeStart = dateFilter.createdAt?.$gte;
    if (rangeStart) {
      // Order.distinct returns one BSON doc — fine at current scale, but has a 16MB/~650k-ObjectId ceiling
      const inRangeCustomerIds = await Order.distinct('customer', { paymentStatus: 'paid', ...dateFilter });
      const returningIds = await Order.distinct('customer', {
        paymentStatus: 'paid',
        customer: { $in: inRangeCustomerIds },
        createdAt: { $lt: rangeStart },
      });
      returningBuyers = returningIds.length;
      newBuyers = inRangeCustomerIds.length - returningIds.length;
    }

    res.json({
      totalRegistered,
      newCustomers,
      suspendedCount,
      topSpenders: topSpenders.map((s) => ({
        customerId: s.customerId?.toString() ?? '',
        name: s.name,
        email: s.email,
        total: s.total,
        orderCount: s.orderCount,
      })),
      newBuyers,
      returningBuyers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
