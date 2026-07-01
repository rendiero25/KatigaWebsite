const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const midtransClient = require('midtrans-client');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const auth = require('../middleware/auth');
const customerAuth = require('../middleware/customerAuth');
const {
  createOrder: biteshipCreateOrder,
  getRates,
  getOrderTracking,
  cancelBiteshipOrder,
} = require('../services/biteshipService');
const { getOrCreateShippingSettings } = require('../services/shippingSettingsService');
const Voucher = require('../models/Voucher');
const { notifyAdmin, notifyCustomer } = require('../utils/notify');

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

const resolvePositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolvePriceNumeric = (primaryValue, fallbackValue) =>
  resolvePositiveNumber(primaryValue) ?? resolvePositiveNumber(fallbackValue) ?? 0;

const resolveShippingWeight = (primaryValue, fallbackValue) =>
  resolvePositiveNumber(primaryValue) ?? resolvePositiveNumber(fallbackValue) ?? 100;

const normalizeDimensions = (primaryDimensions, fallbackDimensions) => ({
  length:
    resolvePositiveNumber(primaryDimensions?.length) ??
    resolvePositiveNumber(fallbackDimensions?.length) ??
    1,
  width:
    resolvePositiveNumber(primaryDimensions?.width) ??
    resolvePositiveNumber(fallbackDimensions?.width) ??
    1,
  height:
    resolvePositiveNumber(primaryDimensions?.height) ??
    resolvePositiveNumber(fallbackDimensions?.height) ??
    1,
});

const buildVoucherUsageFilter = (baseFilter = {}) => ({
  ...baseFilter,
  $or: [
    { voucherReserved: true },
    { voucherConsumed: true },
    {
      voucherReserved: { $exists: false },
      voucherConsumed: { $exists: false },
      paymentStatus: 'paid',
    },
  ],
});

const buildPromotionMaps = (promotions = []) => {
  const promoByProduct = {};
  const promoByCategory = {};

  for (const promo of promotions) {
    if (promo.type === 'products') {
      for (const productId of promo.productIds ?? []) {
        promoByProduct[productId.toString()] = promo;
      }
      continue;
    }

    if (promo.type === 'category' && promo.categoryId) {
      promoByCategory[promo.categoryId.toString()] = promo;
    }
  }

  return { promoByProduct, promoByCategory };
};

const resolveActivePromotion = (product, promotionMaps) =>
  promotionMaps.promoByProduct[product._id.toString()] ??
  promotionMaps.promoByCategory[product.category?.toString() ?? ''] ??
  null;

const applyPromotionPrice = (priceNumeric, promotion) => {
  if (!promotion?.discountPercent) {
    return priceNumeric;
  }

  return Math.max(
    0,
    Math.round(priceNumeric * (1 - Number(promotion.discountPercent) / 100))
  );
};

// ─── Midtrans webhook (registered in server.js with express.raw BEFORE express.json) ───
const webhookHandler = async (req, res) => {
  try {
    const raw = req.body ? req.body.toString() : '';
    if (!raw || raw === '{}' || raw === '') return res.status(200).json({ message: 'OK' });

    const notification = JSON.parse(raw);
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status, payment_type } = notification;

    if (!order_id) return res.status(200).json({ message: 'OK' });

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
    else if (transaction_status === 'expire') { newPaymentStatus = 'expired'; order.orderStatus = 'cancelled'; order.cancelledAt = new Date(); }
    else if (transaction_status === 'refund') newPaymentStatus = 'refunded';

    const previousPaymentStatus = order.paymentStatus;
    const wasPending = order.paymentStatus !== 'paid';
    order.paymentStatus = newPaymentStatus;

    if (order.voucherCode && order.voucherReserved && !order.voucherConsumed) {
      if (newPaymentStatus === 'paid') {
        order.voucherReserved = false;
        order.voucherConsumed = true;
      } else if (['failed', 'expired'].includes(newPaymentStatus)) {
        try {
          const releasedVoucher = await Voucher.findOneAndUpdate(
            { code: order.voucherCode, usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 } }
          );

          if (!releasedVoucher) {
            console.error(
              `[Voucher] Voucher ${order.voucherCode} tidak ditemukan saat release order ${order._id}`
            );
          }
        } catch (voucherErr) {
          console.error('[Voucher] Release on failed payment failed:', voucherErr.message);
        }

        order.voucherReserved = false;
      }
    } else if (newPaymentStatus === 'paid' && order.voucherCode && !order.voucherConsumed) {
      // Backfill legacy orders that were already counted before voucher reservations existed.
      order.voucherConsumed = true;
    }

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

    try {
      if (newPaymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, { $inc: { soldCount: item.quantity, stock: -item.quantity } });
        }
        await notifyAdmin({
          type: 'payment_paid',
          title: 'Pembayaran diterima',
          message: `Pesanan ${order.midtransOrderId} telah dibayar`,
          link: `/admin/orders/${order._id}`,
          relatedId: order._id,
        });
        await notifyCustomer({
          customerId: order.customer,
          type: 'payment_confirmed',
          title: 'Pembayaran dikonfirmasi',
          message: 'Pembayaran untuk pesanan kamu telah dikonfirmasi',
          link: `/pesanan/${order._id}`,
          relatedId: order._id,
        });
      } else if (['failed', 'expired'].includes(newPaymentStatus) && previousPaymentStatus !== newPaymentStatus) {
        const expired = newPaymentStatus === 'expired';
        await notifyAdmin({
          type: 'payment_failed',
          title: 'Pembayaran gagal',
          message: `Pembayaran pesanan ${order.midtransOrderId} ${expired ? 'kedaluwarsa' : 'gagal'}`,
          link: `/admin/orders/${order._id}`,
          relatedId: order._id,
        });
        await notifyCustomer({
          customerId: order.customer,
          type: 'payment_failed',
          title: 'Pembayaran gagal',
          message: `Pembayaran untuk pesanan kamu ${expired ? 'kedaluwarsa' : 'gagal'}`,
          link: `/pesanan/${order._id}`,
          relatedId: order._id,
        });
      }
    } catch (notifyErr) {
      console.error('[Notify] webhook notify failed:', notifyErr.message);
    }

    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(200).json({ message: 'OK' }); // always 200 to stop Midtrans retries
  }
};

// ─── POST /api/orders — create order + get Snap token ───
router.post('/', customerAuth, async (req, res) => {
  let reservedVoucherId = null;

  try {
    const {
      items, shippingAddress, shippingCourier, shippingService,
      voucherCode,
    } = req.body;
    const normalizedVoucherCode = typeof voucherCode === 'string' ? voucherCode.trim().toUpperCase() : '';

    if (
      !items?.length ||
      !shippingAddress ||
      !shippingAddress.areaId ||
      !shippingCourier ||
      !shippingService
    ) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    const activePromotions = await Promotion.find({
      isVisible: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });
    const promotionMaps = buildPromotionMaps(activePromotions);

    // Fetch products from DB — never trust client prices
    const orderItems = [];
    for (const { productId, quantity, variantId } of items) {
      const normalizedVariantId =
        typeof variantId === 'string' && variantId.trim() ? variantId.trim() : undefined;
      const parsedQuantity = Number(quantity);

      if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
        return res.status(400).json({ message: `Kuantitas produk ${productId} tidak valid` });
      }

      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: `Produk ${productId} tidak ditemukan` });

      const matchedVariant = normalizedVariantId
        ? product.variants?.find((variant) => variant._id?.toString() === normalizedVariantId)
        : null;

      if (normalizedVariantId && !matchedVariant) {
        return res.status(400).json({
          message: `Varian ${normalizedVariantId} untuk produk ${product.name} tidak ditemukan`,
        });
      }

      const variantLabel = matchedVariant?.name || 'Varian';
      const priceNumeric = resolvePriceNumeric(matchedVariant?.price, product.priceNumeric);
      if (!priceNumeric) {
        return res.status(400).json({
          message: `Produk ${product.name}${matchedVariant ? ` - ${variantLabel}` : ''} belum memiliki harga numeric`,
        });
      }
      const activePromotion = resolveActivePromotion(product, promotionMaps);
      const finalPriceNumeric = applyPromotionPrice(priceNumeric, activePromotion);

      const weightGrams = resolveShippingWeight(
        matchedVariant?.weightGrams,
        product.weightGrams
      );
      const dimensions = normalizeDimensions(
        matchedVariant?.dimensions,
        product.dimensions
      );

      orderItems.push({
        product: product._id,
        variantId: matchedVariant?._id?.toString(),
        variantName: matchedVariant?.name,
        name: matchedVariant ? `${product.name} - ${variantLabel}` : product.name,
        image: product.image || (product.images?.[0] ?? ''),
        priceNumeric: finalPriceNumeric,
        weightGrams,
        dimensions,
        quantity: parsedQuantity,
        subtotal: finalPriceNumeric * parsedQuantity,
      });
    }

    let matchedRate;
    try {
      const settings = await getOrCreateShippingSettings();

      if (!settings.enabledCouriers.length) {
        return res.status(400).json({ message: 'Metode pengiriman tidak tersedia untuk alamat ini' });
      }

      const providerRates = await getRates({
        destinationAreaId: shippingAddress.areaId,
        items: orderItems,
        courierCodes: settings.enabledCouriers,
      });

      if (!providerRates.length) {
        return res.status(400).json({ message: 'Metode pengiriman tidak tersedia untuk alamat ini' });
      }

      matchedRate = providerRates.find(
        (rate) =>
          rate.courier_code === shippingCourier &&
          rate.courier_service_code === shippingService
      );

      if (!matchedRate) {
        return res.status(400).json({ message: 'Metode pengiriman yang dipilih tidak lagi tersedia' });
      }
    } catch (shippingErr) {
      if (shippingErr.response || shippingErr.request) {
        console.error('[Shipping Rates]', shippingErr.response?.data ?? shippingErr.message);
        return res.status(502).json({ message: 'Gagal memverifikasi metode pengiriman' });
      }

      throw shippingErr;
    }

    // Server-side voucher re-validation
    let appliedVoucherCode = '';
    let appliedVoucherDiscount = 0;
    let voucherDoc = null;

    if (voucherCode) {
      voucherDoc = await Voucher.findOne({ code: normalizedVoucherCode, isActive: true });
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

      if (voucherDoc.perUserLimit > 0) {
        const userUsage = await Order.countDocuments(
          buildVoucherUsageFilter({
            customer: req.customer._id,
            voucherCode: voucherDoc.code,
          })
        );
        if (userUsage >= voucherDoc.perUserLimit) {
          return res.status(400).json({ message: 'Kamu sudah menggunakan voucher ini' });
        }
      }

      appliedVoucherCode = voucherDoc.code;
      let recalcDiscount = voucherDoc.discountType === 'percent'
        ? Math.round(itemsSubtotal * voucherDoc.discountValue / 100)
        : voucherDoc.discountValue;
      if (voucherDoc.discountType === 'percent' && voucherDoc.maxDiscount != null && voucherDoc.maxDiscount > 0) {
        recalcDiscount = Math.min(recalcDiscount, voucherDoc.maxDiscount);
      }
      appliedVoucherDiscount = Math.min(recalcDiscount, itemsSubtotal);

      const reservedVoucher = await Voucher.findOneAndUpdate(
        voucherDoc.usageLimit > 0
          ? { _id: voucherDoc._id, usedCount: { $lt: voucherDoc.usageLimit } }
          : { _id: voucherDoc._id },
        { $inc: { usedCount: 1 } },
        { new: true }
      );

      if (!reservedVoucher) {
        return res.status(400).json({ message: 'Voucher tidak dapat digunakan' });
      }

      reservedVoucherId = voucherDoc._id.toString();
    }

    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    const verifiedShippingCost = Number(matchedRate.price);
    const verifiedShippingServiceName = `${matchedRate.courier_name} ${matchedRate.courier_service_name}`;
    const verifiedEstimatedDays = matchedRate.duration ?? '';
    const total = subtotal - appliedVoucherDiscount + verifiedShippingCost;

    const order = new Order({
      customer: req.customer._id,
      customerSnapshot: { name: req.customer.name, email: req.customer.email, phone: req.customer.phone },
      items: orderItems,
      subtotal,
      shippingCost: verifiedShippingCost,
      total,
      shippingAddress,
      shippingCourier,
      shippingService,
      shippingServiceName: verifiedShippingServiceName,
      estimatedDays: verifiedEstimatedDays,
      voucherCode: appliedVoucherCode,
      voucherDiscount: appliedVoucherDiscount,
      voucherReserved: Boolean(appliedVoucherCode),
    });
    order.midtransOrderId = order._id.toString();

    const snapTransaction = await snap.createTransaction({
      transaction_details: { order_id: order.midtransOrderId, gross_amount: total },
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
          price: verifiedShippingCost,
          quantity: 1,
          name: `Ongkir ${verifiedShippingServiceName}`.substring(0, 50),
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

    try {
      await notifyAdmin({
        type: 'order_new',
        title: 'Pesanan baru',
        message: `Pesanan baru dari ${req.customer.name} senilai Rp${total.toLocaleString('id-ID')}`,
        link: `/admin/orders/${order._id}`,
        relatedId: order._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] order_new failed:', notifyErr.message);
    }

    res.status(201).json({ orderId: order._id, snapToken: snapTransaction.token });
  } catch (err) {
    if (reservedVoucherId) {
      try {
        await Voucher.findOneAndUpdate(
          { _id: reservedVoucherId, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
      } catch (voucherErr) {
        console.error('[Voucher] Release after create-order failure failed:', voucherErr.message);
      }
    }

    console.error('[Create Order]', err);
    res.status(500).json({ message: 'Gagal membuat pesanan' });
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

// ─── POST /api/orders/my/:id/verify-payment — pull fresh status from Midtrans ───
router.post('/my/:id/verify-payment', customerAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (order.paymentStatus === 'paid') return res.json(order);

    const coreApi = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    const statusResponse = await coreApi.transaction.status(order.midtransOrderId);
    const { transaction_status, fraud_status, payment_type } = statusResponse;

    let newPaymentStatus = order.paymentStatus;
    if (transaction_status === 'capture' && fraud_status === 'accept') newPaymentStatus = 'paid';
    else if (transaction_status === 'settlement') newPaymentStatus = 'paid';
    else if (transaction_status === 'pending') newPaymentStatus = 'pending';
    else if (['deny', 'cancel', 'failure'].includes(transaction_status)) newPaymentStatus = 'failed';
    else if (transaction_status === 'expire') newPaymentStatus = 'expired';

    if (newPaymentStatus === order.paymentStatus) return res.json(order);

    const previousPaymentStatus = order.paymentStatus;
    order.paymentStatus = newPaymentStatus;
    order.midtransPaymentType = payment_type ?? '';

    if (newPaymentStatus === 'paid' && order.orderStatus === 'awaiting_payment') {
      order.orderStatus = 'processing';
      try {
        const biteshipResult = await biteshipCreateOrder(order);
        order.biteshipOrderId = biteshipResult.id ?? '';
        order.biteshipTrackingCode = biteshipResult.courier?.tracking_id ?? '';
        order.biteshipWaybillId = biteshipResult.courier?.waybill_id ?? '';
      } catch (bErr) {
        console.error('[Biteship] verify-payment auto-create failed:', bErr.message);
      }
    }

    if (order.voucherCode && order.voucherReserved && !order.voucherConsumed) {
      if (newPaymentStatus === 'paid') {
        order.voucherReserved = false;
        order.voucherConsumed = true;
      }
    }

    await order.save();

    if (newPaymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
      try {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, { $inc: { soldCount: item.quantity, stock: -item.quantity } });
        }
        await notifyAdmin({
          type: 'payment_paid',
          title: 'Pembayaran diterima',
          message: `Pesanan ${order.midtransOrderId} telah dibayar`,
          link: `/admin/orders/${order._id}`,
          relatedId: order._id,
        });
        await notifyCustomer({
          customerId: order.customer,
          type: 'payment_confirmed',
          title: 'Pembayaran dikonfirmasi',
          message: 'Pembayaran untuk pesanan kamu telah dikonfirmasi',
          link: `/pesanan/${order._id}`,
          relatedId: order._id,
        });
      } catch (notifyErr) {
        console.error('[Notify] verify-payment notify failed:', notifyErr.message);
      }
    }

    res.json(order);
  } catch (err) {
    console.error('[Verify Payment]', err);
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
    const previousPaymentStatus = order.paymentStatus;
    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;

      if (order.voucherCode && order.voucherReserved && !order.voucherConsumed) {
        if (paymentStatus === 'paid') {
          order.voucherReserved = false;
          order.voucherConsumed = true;
        } else if (['failed', 'expired'].includes(paymentStatus)) {
          const releasedVoucher = await Voucher.findOneAndUpdate(
            { code: order.voucherCode, usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 } }
          );

          if (!releasedVoucher) {
            console.error(
              `[Voucher] Voucher ${order.voucherCode} tidak ditemukan saat release manual order ${order._id}`
            );
          }

          order.voucherReserved = false;
        }
      } else if (paymentStatus === 'paid' && order.voucherCode && !order.voucherConsumed) {
        order.voucherConsumed = true;
      }
    }
    if (adminNote !== undefined) order.adminNote = adminNote;
    if (biteshipTrackingCode !== undefined) order.biteshipTrackingCode = biteshipTrackingCode;
    await order.save();

    if (paymentStatus && paymentStatus !== previousPaymentStatus) {
      try {
        if (paymentStatus === 'paid') {
          for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, { $inc: { soldCount: item.quantity } });
          }
          await notifyCustomer({
            customerId: order.customer,
            type: 'payment_confirmed',
            title: 'Pembayaran dikonfirmasi',
            message: 'Pembayaran untuk pesanan kamu telah dikonfirmasi',
            link: `/pesanan/${order._id}`,
            relatedId: order._id,
          });
        } else if (['failed', 'expired'].includes(paymentStatus)) {
          await notifyCustomer({
            customerId: order.customer,
            type: 'payment_failed',
            title: 'Pembayaran gagal',
            message: `Pembayaran untuk pesanan kamu ${paymentStatus === 'expired' ? 'kedaluwarsa' : 'gagal'}`,
            link: `/pesanan/${order._id}`,
            relatedId: order._id,
          });
        }
      } catch (notifyErr) {
        console.error('[Notify] manual status update notify failed:', notifyErr.message);
      }
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/orders/my/:id/cancel — customer cancel ───
router.post('/my/:id/cancel', customerAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });

    const cancellableStatuses = ['awaiting_payment', 'processing'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Pesanan tidak dapat dibatalkan pada tahap ini' });
    }

    const coreApi = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    if (order.paymentStatus === 'paid') {
      try {
        await coreApi.transaction.refund(order.midtransOrderId, {
          refund_key: `refund-${order._id}`,
          amount: order.total,
          reason: 'Customer request',
        });
        order.paymentStatus = 'refunded';
      } catch (refundErr) {
        console.error('[Cancel] Midtrans refund failed:', refundErr.message);
        return res.status(502).json({ message: 'Gagal memproses refund. Hubungi admin.' });
      }
    } else if (order.paymentStatus === 'pending') {
      try {
        await coreApi.transaction.cancel(order.midtransOrderId);
      } catch (cancelErr) {
        if (!cancelErr.message?.includes('404')) {
          console.error('[Cancel] Midtrans cancel failed:', cancelErr.message);
        }
      }
      order.paymentStatus = 'expired';
    }

    if (order.voucherCode && order.voucherReserved && !order.voucherConsumed) {
      try {
        await Voucher.findOneAndUpdate(
          { code: order.voucherCode, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
        order.voucherReserved = false;
      } catch (vErr) {
        console.error('[Cancel] Voucher release failed:', vErr.message);
      }
    }

    if (order.biteshipOrderId) {
      try {
        await cancelBiteshipOrder(order.biteshipOrderId);
      } catch (bErr) {
        console.error('[Cancel] Biteship cancel failed:', bErr.message);
      }
    }

    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    await order.save();

    try {
      await notifyAdmin({
        type: 'order_cancelled',
        title: 'Pesanan dibatalkan',
        message: `Pesanan ${order.midtransOrderId} dibatalkan oleh customer`,
        link: `/admin/orders/${order._id}`,
        relatedId: order._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] cancel notify failed:', notifyErr.message);
    }

    res.json(order);
  } catch (err) {
    console.error('[Cancel Order]', err);
    res.status(500).json({ message: 'Gagal membatalkan pesanan' });
  }
});

// ─── GET /api/orders/my/:id/tracking — Biteship live tracking ───
router.get('/my/:id/tracking', customerAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (!order.biteshipOrderId) return res.status(400).json({ message: 'Pesanan belum memiliki data pengiriman' });

    const tracking = await getOrderTracking(order.biteshipOrderId);
    res.json(tracking);
  } catch (err) {
    console.error('[Tracking]', err.message);
    res.status(502).json({ message: 'Gagal mengambil data tracking' });
  }
});

// ─── helper: generate invoice PDF into response stream ───
const buildInvoicePdf = (order, res) => {
  const fmtIDR = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${order._id}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).text('KumaKuma / Katiga.id', { align: 'left' });
  doc.fontSize(10).fillColor('#666').text('katiga.id', { align: 'left' });
  doc.fillColor('#000');
  doc.moveDown();

  doc.fontSize(16).text('INVOICE', { align: 'right' });
  doc.fontSize(10).text(`#${order._id.toString().toUpperCase()}`, { align: 'right' });
  doc.text(`Tanggal: ${new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'right' });
  doc.moveDown();

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  // Customer info
  doc.fontSize(11).text('Kepada:');
  doc.fontSize(10).text(order.customerSnapshot?.name ?? '');
  doc.text(order.customerSnapshot?.email ?? '');
  if (order.customerSnapshot?.phone) doc.text(order.customerSnapshot.phone);
  doc.moveDown(0.5);
  doc.text(`${order.shippingAddress.street}`);
  doc.text(`${order.shippingAddress.areaName} ${order.shippingAddress.postalCode}`);
  doc.moveDown();

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  // Items table
  const col = { name: 50, qty: 320, price: 380, subtotal: 470 };
  doc.fontSize(10).fillColor('#444');
  doc.text('Produk', col.name, doc.y);
  doc.text('Qty', col.qty, doc.y - doc.currentLineHeight());
  doc.text('Harga', col.price, doc.y - doc.currentLineHeight());
  doc.text('Subtotal', col.subtotal, doc.y - doc.currentLineHeight());
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
  doc.fillColor('#000');
  doc.moveDown(0.3);

  for (const item of order.items) {
    const y = doc.y;
    doc.fontSize(9).text(item.name, col.name, y, { width: 260 });
    doc.text(String(item.quantity), col.qty, y);
    doc.text(fmtIDR(item.priceNumeric), col.price, y);
    doc.text(fmtIDR(item.subtotal), col.subtotal, y);
    doc.moveDown(0.5);
  }

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
  doc.moveDown(0.5);

  // Totals
  const addRow = (label, value, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10);
    doc.text(label, 380, doc.y);
    doc.text(value, 470, doc.y - doc.currentLineHeight());
    doc.moveDown(0.3);
  };
  doc.font('Helvetica');
  addRow('Subtotal produk', fmtIDR(order.subtotal));
  addRow(`Ongkir (${order.shippingServiceName})`, fmtIDR(order.shippingCost));
  if ((order.voucherDiscount ?? 0) > 0) {
    addRow(`Diskon voucher${order.voucherCode ? ` (${order.voucherCode})` : ''}`, `-${fmtIDR(order.voucherDiscount)}`);
  }
  doc.font('Helvetica-Bold');
  addRow('TOTAL', fmtIDR(order.total), true);

  doc.moveDown();
  doc.font('Helvetica').fontSize(9).fillColor('#888').text('Terima kasih telah berbelanja di KumaKuma!', { align: 'center' });

  doc.end();
};

// ─── GET /api/orders/my/:id/invoice — customer download invoice ───
router.get('/my/:id/invoice', customerAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (!['paid', 'refunded'].includes(order.paymentStatus) && order.orderStatus !== 'cancelled') {
      return res.status(400).json({ message: 'Invoice hanya tersedia untuk pesanan yang sudah dibayar' });
    }
    buildInvoicePdf(order, res);
  } catch (err) {
    console.error('[Invoice]', err);
    res.status(500).json({ message: 'Gagal membuat invoice' });
  }
});

// ─── GET /api/orders/:id/invoice — admin download invoice ───
router.get('/:id/invoice', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    buildInvoicePdf(order, res);
  } catch (err) {
    console.error('[Invoice Admin]', err);
    res.status(500).json({ message: 'Gagal membuat invoice' });
  }
});

// ─── POST /api/orders/:id/accept — admin accept order → packing ───
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (order.orderStatus !== 'processing') {
      return res.status(400).json({ message: 'Hanya pesanan berstatus "Diproses" yang dapat diterima' });
    }
    order.orderStatus = 'packing';
    await order.save();
    try {
      await notifyCustomer({
        customerId: order.customer,
        type: 'order_packing',
        title: 'Pesanan sedang disiapkan',
        message: 'Pesananmu sedang dikemas oleh tim kami',
        link: `/pesanan/${order._id}`,
        relatedId: order._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] accept notify failed:', notifyErr.message);
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/orders/:id/ship — admin: mark as shipped ───
router.put('/:id/ship', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (order.orderStatus !== 'packing') {
      return res.status(400).json({ message: 'Hanya pesanan berstatus "Dikemas" yang dapat dikirim' });
    }
    const { trackingCode } = req.body;
    order.orderStatus = 'shipped';
    if (trackingCode) order.biteshipTrackingCode = trackingCode;
    await order.save();
    try {
      await notifyCustomer({
        customerId: order.customer,
        type: 'order_shipped',
        title: 'Pesanan sedang dikirim',
        message: `Pesananmu sedang dalam perjalanan${trackingCode ? ` — resi: ${trackingCode}` : ''}`,
        link: `/pesanan/${order._id}`,
        relatedId: order._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] ship notify failed:', notifyErr.message);
    }
    res.json(order);
  } catch (err) {
    console.error('[Ship Order]', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/orders/:id/tracking — admin: Biteship live tracking ───
router.get('/:id/tracking', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (!order.biteshipOrderId) return res.status(400).json({ message: 'Pesanan belum memiliki data pengiriman' });
    const tracking = await getOrderTracking(order.biteshipOrderId);
    res.json(tracking);
  } catch (err) {
    console.error('[Admin Tracking]', err.message);
    res.status(502).json({ message: 'Gagal mengambil data tracking' });
  }
});

// ─── POST /api/orders/:id/sync-biteship — admin: manual retry AWB/tracking sync ───
router.post('/:id/sync-biteship', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (['awaiting_payment', 'cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Sinkronisasi hanya untuk pesanan yang sudah diproses' });
    }

    if (!order.biteshipOrderId) {
      const biteshipResult = await biteshipCreateOrder(order);
      order.biteshipOrderId = biteshipResult.id ?? '';
      order.biteshipTrackingCode = biteshipResult.courier?.tracking_id ?? '';
      order.biteshipWaybillId = biteshipResult.courier?.waybill_id ?? '';
    } else {
      const tracking = await getOrderTracking(order.biteshipOrderId);
      if (tracking.courier?.tracking_id) order.biteshipTrackingCode = tracking.courier.tracking_id;
      if (tracking.waybill_id) order.biteshipWaybillId = tracking.waybill_id;
    }

    await order.save();
    res.json(order);
  } catch (err) {
    console.error('[Sync Biteship]', err.message);
    res.status(502).json({ message: 'Gagal sinkronisasi dengan Biteship' });
  }
});

// ─── Biteship webhook (registered in server.js before express-json routes) ───
const biteshipWebhookHandler = async (req, res) => {
  try {
    const { event, data } = req.body ?? {};
    if (event !== 'order.status_update' || !data?.id) {
      return res.status(200).json({ message: 'OK' });
    }
    if (data.status === 'delivered') {
      const order = await Order.findOne({ biteshipOrderId: data.id });
      if (order && order.orderStatus !== 'delivered') {
        order.orderStatus = 'delivered';
        await order.save();
        try {
          await notifyCustomer({
            customerId: order.customer,
            type: 'order_delivered',
            title: 'Pesanan telah sampai',
            message: 'Pesananmu telah berhasil diterima',
            link: `/pesanan/${order._id}`,
            relatedId: order._id,
          });
        } catch (notifyErr) {
          console.error('[Notify] delivered notify failed:', notifyErr.message);
        }
      }
    }
    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error('[Biteship Webhook]', err.message);
    res.status(200).json({ message: 'OK' }); // Always 200 to prevent Biteship retries
  }
};

module.exports = router;
module.exports.webhookHandler = webhookHandler;
module.exports.biteshipWebhookHandler = biteshipWebhookHandler;
