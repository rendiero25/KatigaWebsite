const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const midtransClient = require('midtrans-client');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const auth = require('../middleware/auth');
const customerAuth = require('../middleware/customerAuth');
const {
  createOrder: biteshipCreateOrder,
  getRates,
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
    else if (transaction_status === 'expire') newPaymentStatus = 'expired';
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
          await Product.findByIdAndUpdate(item.product, { $inc: { soldCount: item.quantity } });
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
          await Product.findByIdAndUpdate(item.product, { $inc: { soldCount: item.quantity } });
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

module.exports = router;
module.exports.webhookHandler = webhookHandler;
