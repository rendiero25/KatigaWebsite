const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

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

module.exports = router;
