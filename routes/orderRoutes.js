const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const midtransClient = require('midtrans-client');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const customerAuth = require('../middleware/customerAuth');
const { createOrder: biteshipCreateOrder } = require('../services/biteshipService');
const Voucher = require('../models/Voucher');

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// ─── Midtrans webhook (registered in server.js with express.raw BEFORE express.json) ───
const webhookHandler = async (req, res) => {
  try {
    const notification = JSON.parse(req.body.toString());
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status, payment_type } = notification;

    const expectedSig = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
      .digest('hex');

    if (expectedSig !== signature_key) {
      return res.status(403).json({ message: 'Invalid signature' });
    }

    const order = await Order.findOne({ midtransOrderId: order_id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.midtransPaymentType = payment_type ?? '';

    let newPaymentStatus = order.paymentStatus;
    if (transaction_status === 'capture' && fraud_status === 'accept') newPaymentStatus = 'paid';
    else if (transaction_status === 'settlement') newPaymentStatus = 'paid';
    else if (transaction_status === 'pending') newPaymentStatus = 'pending';
    else if (['deny', 'cancel', 'failure'].includes(transaction_status)) newPaymentStatus = 'failed';
    else if (transaction_status === 'expire') newPaymentStatus = 'expired';
    else if (transaction_status === 'refund') newPaymentStatus = 'refunded';

    const wasPending = order.paymentStatus !== 'paid';
    order.paymentStatus = newPaymentStatus;

    if (newPaymentStatus === 'paid' && wasPending && order.orderStatus === 'awaiting_payment') {
      order.orderStatus = 'processing';
      try {
        const biteshipResult = await biteshipCreateOrder(order);
        order.biteshipOrderId = biteshipResult.id ?? '';
        order.biteshipTrackingCode = biteshipResult.courier?.tracking_id ?? '';
        order.biteshipWaybillId = biteshipResult.courier?.waybill_id ?? '';
      } catch (bErr) {
        console.error('[Biteship] Auto-create order failed:', bErr.message);
      }
    }

    await order.save();
    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(200).json({ message: 'OK' }); // always 200 to stop Midtrans retries
  }
};

// ─── POST /api/orders — create order + get Snap token ───
router.post('/', customerAuth, async (req, res) => {
  try {
    const {
      items, shippingAddress, shippingCourier, shippingService,
      shippingServiceName, shippingCost, estimatedDays,
      voucherCode, voucherDiscount,
    } = req.body;

    if (!items?.length || !shippingAddress || !shippingCourier || shippingCost === undefined) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    // Fetch products from DB — never trust client prices
    const orderItems = [];
    for (const { productId, quantity } of items) {
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: `Produk ${productId} tidak ditemukan` });
      if (!product.priceNumeric) return res.status(400).json({ message: `Produk ${product.name} belum memiliki harga numeric` });
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.image || (product.images?.[0] ?? ''),
        priceNumeric: product.priceNumeric,
        weightGrams: product.weightGrams ?? 0,
        quantity,
        subtotal: product.priceNumeric * quantity,
      });
    }

    // Server-side voucher re-validation
    let appliedVoucherCode = '';
    let appliedVoucherDiscount = 0;
    let voucherDoc = null;

    if (voucherCode) {
      voucherDoc = await Voucher.findOne({ code: voucherCode.toUpperCase(), isActive: true });
      if (!voucherDoc) return res.status(400).json({ message: 'Voucher tidak valid' });

      const now = new Date();
      const itemsSubtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
      if (
        now < voucherDoc.startDate || now > voucherDoc.endDate ||
        itemsSubtotal < voucherDoc.minOrderAmount ||
        (voucherDoc.usageLimit > 0 && voucherDoc.usedCount >= voucherDoc.usageLimit)
      ) {
        return res.status(400).json({ message: 'Voucher tidak dapat digunakan' });
      }

      appliedVoucherCode = voucherDoc.code;
      let recalcDiscount = voucherDoc.discountType === 'percent'
        ? Math.round(itemsSubtotal * voucherDoc.discountValue / 100)
        : voucherDoc.discountValue;
      if (voucherDoc.discountType === 'percent' && voucherDoc.maxDiscount != null && voucherDoc.maxDiscount > 0) {
        recalcDiscount = Math.min(recalcDiscount, voucherDoc.maxDiscount);
      }
      appliedVoucherDiscount = Math.min(recalcDiscount, itemsSubtotal);
    }

    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    const total = subtotal - appliedVoucherDiscount + Number(shippingCost);

    const order = new Order({
      customer: req.customer._id,
      customerSnapshot: { name: req.customer.name, email: req.customer.email, phone: req.customer.phone },
      items: orderItems,
      subtotal,
      shippingCost: Number(shippingCost),
      total,
      shippingAddress,
      shippingCourier,
      shippingService,
      shippingServiceName: shippingServiceName ?? '',
      estimatedDays: estimatedDays ?? '',
      voucherCode: appliedVoucherCode,
      voucherDiscount: appliedVoucherDiscount,
    });
    await order.save();
    order.midtransOrderId = order._id.toString();

    const snapTransaction = await snap.createTransaction({
      transaction_details: { order_id: order._id.toString(), gross_amount: total },
      customer_details: {
        first_name: req.customer.name,
        email: req.customer.email,
        phone: req.customer.phone,
        shipping_address: {
          first_name: shippingAddress.recipientName,
          phone: shippingAddress.phone,
          address: shippingAddress.street,
          city: shippingAddress.city,
          postal_code: shippingAddress.postalCode,
        },
      },
      item_details: (() => {
        const itemDetails = orderItems.map((i) => ({
          id: i.product.toString(),
          price: i.priceNumeric,
          quantity: i.quantity,
          name: i.name.substring(0, 50),
        }));
        itemDetails.push({
          id: 'SHIPPING',
          price: Number(shippingCost),
          quantity: 1,
          name: `Ongkir ${shippingCourier.toUpperCase()} ${shippingService}`,
        });
        if (appliedVoucherDiscount > 0) {
          itemDetails.push({
            id: 'VOUCHER',
            price: -appliedVoucherDiscount,
            quantity: 1,
            name: `Diskon ${appliedVoucherCode}`,
          });
        }
        return itemDetails;
      })(),
    });

    order.midtransToken = snapTransaction.token;
    await order.save();

    if (voucherDoc) {
      await Voucher.findByIdAndUpdate(voucherDoc._id, { $inc: { usedCount: 1 } });
    }

    res.status(201).json({ orderId: order._id, snapToken: snapTransaction.token });
  } catch (err) {
    console.error('[Create Order]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/orders/my — customer's orders ───
router.get('/my', customerAuth, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.customer._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/orders/my/:id — customer's single order ───
router.get('/my/:id', customerAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/orders — admin: all orders ───
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, orderStatus, paymentStatus, search } = req.query;
    const filter = {};
    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (search) {
      filter.$or = [
        { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
        { midtransOrderId: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.json({ data: orders, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/orders/:id — admin: single order ───
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/orders/:id/status — admin: manual update ───
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { orderStatus, paymentStatus, adminNote, biteshipTrackingCode } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (adminNote !== undefined) order.adminNote = adminNote;
    if (biteshipTrackingCode !== undefined) order.biteshipTrackingCode = biteshipTrackingCode;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
module.exports.webhookHandler = webhookHandler;
