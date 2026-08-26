const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
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
const {
  computeVoucherDiscount,
  eligibleSubtotal: computeVoucherEligibleSubtotal,
} = require('../utils/voucherScope');
const { notifyAdmin, notifyCustomer } = require('../utils/notify');
const { createPayment, getTransaction, closePayment, MayarError } = require('../services/mayarService');

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

// Nilai yang diketahui menandakan lunas. Ditulis sebagai himpunan, bukan satu konstanta,
// karena Mayar memakai kosakata berbeda per endpoint: detail transaksi mengembalikan
// 'created' sebelum bayar, sementara daftar transaksi lunas mendokumentasikan 'settled'.
// Nilai lunas pada detail transaksi belum pernah teramati langsung — simulator sandbox
// tidak menyelesaikan settlement — jadi keduanya diterima dan nilai asing dicatat ke log.
const MAYAR_PAID_STATUSES = new Set(['paid', 'settled', 'success']);

// Diverifikasi di sandbox 2026-08-13: transaksi kedaluwarsa TETAP berstatus 'created';
// yang berubah hanya paymentLink.status menjadi 'closed'. Menutup payment request lewat
// POST /payments/{id}/close menghasilkan keadaan yang sama persis.
const resolvePaymentStatus = (transaction) => {
  if (MAYAR_PAID_STATUSES.has(transaction.status)) return 'paid';
  if (transaction.linkStatus === 'closed') return 'expired';
  if (['created', 'unpaid', 'active'].includes(transaction.status)) return 'pending';
  return null;
};

// Satu-satunya tempat status pembayaran berubah. Dipanggil webhook, verify-payment,
// dan sapuan terjadwal — karena itu wajib idempoten.
const syncPaymentStatus = async (order) => {
  if (!order.paymentRef) return order;

  let transaction;
  try {
    transaction = await getTransaction(order.paymentRef);
  } catch (err) {
    if (err instanceof MayarError && err.status === 404) {
      console.error(`[Mayar] transaksi ${order.paymentRef} tidak ditemukan untuk order ${order._id}`);
      return order;
    }
    throw err;
  }

  const newPaymentStatus = resolvePaymentStatus(transaction);
  if (!newPaymentStatus) {
    console.error(
      `[Mayar] status tidak dikenal "${transaction.status}" (link "${transaction.linkStatus}") untuk order ${order._id}`
    );
    return order;
  }

  const previousPaymentStatus = order.paymentStatus;
  if (newPaymentStatus === previousPaymentStatus) return order;

  // Pesanan yang sudah lunas tidak boleh diturunkan lagi oleh webhook yang datang
  // terlambat — link pembayarannya memang ditutup sesudah dibayar.
  if (previousPaymentStatus === 'paid') return order;

  order.paymentStatus = newPaymentStatus;
  order.paymentMethod = transaction.paymentMethod ?? '';

  if (newPaymentStatus === 'paid') {
    if (order.voucherCode && order.voucherReserved && !order.voucherConsumed) {
      order.voucherReserved = false;
      order.voucherConsumed = true;
    } else if (order.voucherCode && !order.voucherConsumed) {
      // Backfill order lama yang sudah terhitung sebelum reservasi voucher ada.
      order.voucherConsumed = true;
    }

    if (order.orderStatus === 'awaiting_payment') {
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
  }

  if (newPaymentStatus === 'expired') {
    if (order.voucherCode && order.voucherReserved && !order.voucherConsumed) {
      try {
        const released = await Voucher.findOneAndUpdate(
          { code: order.voucherCode, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
        if (!released) {
          console.error(`[Voucher] Voucher ${order.voucherCode} tidak ditemukan saat release order ${order._id}`);
        }
      } catch (voucherErr) {
        console.error('[Voucher] Release on expired payment failed:', voucherErr.message);
      }
      order.voucherReserved = false;
    }
    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
  }

  await order.save();

  try {
    if (newPaymentStatus === 'paid') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { soldCount: item.quantity, stock: -item.quantity } });
      }
      await notifyAdmin({
        type: 'payment_paid',
        title: 'Pembayaran diterima',
        message: `Pesanan ${order.orderCode} telah dibayar`,
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
    } else if (newPaymentStatus === 'expired') {
      await notifyAdmin({
        type: 'payment_failed',
        title: 'Pembayaran kedaluwarsa',
        message: `Pembayaran pesanan ${order.orderCode} kedaluwarsa`,
        link: `/admin/orders/${order._id}`,
        relatedId: order._id,
      });
      await notifyCustomer({
        customerId: order.customer,
        type: 'payment_failed',
        title: 'Pembayaran kedaluwarsa',
        message: 'Pembayaran untuk pesanan kamu kedaluwarsa',
        link: `/pesanan/${order._id}`,
        relatedId: order._id,
      });
    }
  } catch (notifyErr) {
    console.error('[Notify] syncPaymentStatus notify failed:', notifyErr.message);
  }

  return order;
};

// ─── Webhook Mayar ───
// Payload tidak diverifikasi — docs Mayar tidak mendokumentasikan signature maupun header
// Authorization apa pun. Karena itu payload hanya dipakai untuk mengetahui transaksi MANA
// yang berubah; status sebenarnya selalu diambil ulang dari API Mayar memakai API key kita.
const webhookHandler = async (req, res) => {
  try {
    const payload = req.body ?? {};
    // Bentuk payload diverifikasi dari riwayat webhook Mayar 14 Agt 2026:
    // { event: 'payment.received', data: { transactionId, status, extraData: { orderId } } }.
    // data.transactionId sama dengan paymentRef yang kita simpan.
    const transactionId = payload.data?.transactionId ?? null;

    if (!transactionId) {
      console.error('[Webhook Mayar] payload tanpa transactionId:', JSON.stringify(payload));
      return res.status(200).json({ message: 'OK' });
    }

    const order = await Order.findOne({ paymentRef: transactionId });
    if (!order) {
      console.error(`[Webhook Mayar] order untuk paymentRef ${transactionId} tidak ditemukan`);
      return res.status(200).json({ message: 'OK' });
    }

    await syncPaymentStatus(order);
    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error('[Webhook Mayar] Error:', err.message);
    // Selalu 200, termasuk saat order tidak ditemukan — status non-2xx mengundang
    // percobaan ulang berulang dari Mayar.
    res.status(200).json({ message: 'OK' });
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
    const voucherScopeItems = [];
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

      // Dipakai untuk menghitung cakupan voucher; kategori dibaca dari produk,
      // bukan dari payload klien.
      voucherScopeItems.push({
        productId: String(product._id),
        categoryId: product.category ? String(product.category) : '',
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

      // Voucher bercakupan hanya memotong item yang memenuhi syarat. Rumusnya
      // dibagi dengan /vouchers/validate supaya angka checkout dan tagihan sama.
      if (computeVoucherEligibleSubtotal(voucherDoc, voucherScopeItems) <= 0) {
        return res.status(400).json({
          message: 'Tidak ada produk di keranjang yang memenuhi syarat voucher ini',
        });
      }

      appliedVoucherCode = voucherDoc.code;
      appliedVoucherDiscount = computeVoucherDiscount(voucherDoc, voucherScopeItems);

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
    order.orderCode = order._id.toString();

    const expiryHours = Number(process.env.MAYAR_PAYMENT_EXPIRY_HOURS) || 24;
    const paymentExpiredAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const payment = await createPayment({
      name: `Pesanan ${order.orderCode}`,
      amount: total,
      email: req.customer.email,
      mobile: req.customer.phone,
      description: `Pembayaran pesanan ${order.orderCode} di katiga.id`,
      expiredAt: paymentExpiredAt.toISOString(),
      redirectUrl: `${process.env.FRONTEND_URL}/pesanan/${order._id}/selesai?verify=1`,
      extraData: { orderId: order._id.toString() },
    });

    order.paymentRef = payment.transactionId;
    order.paymentLinkId = payment.id;
    order.paymentLink = payment.link;
    order.paymentExpiredAt = paymentExpiredAt;
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

    res.status(201).json({ orderId: order._id, paymentLink: payment.link });
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

    if (err instanceof MayarError && [409, 429].includes(err.status)) {
      console.error(`[Create Order] Mayar menolak duplikat (${err.status})`);
      return res.status(429).json({
        message: 'Permintaan pembayaran sebelumnya masih diproses. Tunggu satu menit lalu coba lagi.',
      });
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

// ─── POST /api/orders/my/:id/verify-payment — tarik status terbaru dari Mayar ───
router.post('/my/:id/verify-payment', customerAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (order.paymentStatus === 'paid') return res.json(order);

    await syncPaymentStatus(order);
    res.json(order);
  } catch (err) {
    console.error('[Verify Payment]', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/orders — admin: all orders ───
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, orderStatus, paymentStatus, search, deleted } = req.query;
    const filter = {};
    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (search) {
      filter.$or = [
        { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
        { orderCode: { $regex: search, $options: 'i' } },
      ];
    }
    // Kotak sampah: satu-satunya tampilan yang menembus filter soft-delete skema.
    const showDeleted = deleted === '1';
    if (showDeleted) filter.deletedAt = { $ne: null };

    const total = await Order.countDocuments(filter).setOptions({ withDeleted: showDeleted });
    const orders = await Order.find(filter)
      .setOptions({ withDeleted: showDeleted })
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

// ─── DELETE /api/orders/:id — admin: soft delete + tutup payment request di Mayar ───
// Soft delete, bukan hapus baris: laporan lama tetap bisa direkonsiliasi dan order bisa
// dipulihkan. Mayar sendiri tidak punya endpoint hapus — transaksi di sana permanen,
// yang bisa dilakukan hanya menutup link pembayarannya agar tidak bisa dibayar lagi.
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });

    let mayarWarning = '';
    if (order.paymentLinkId && order.paymentStatus !== 'paid') {
      try {
        await closePayment(order.paymentLinkId);
      } catch (err) {
        // Gagal menutup link tidak boleh membatalkan penghapusan — admin diberi tahu
        // supaya bisa menutupnya manual dari dashboard Mayar.
        mayarWarning = `Order dihapus, tapi link pembayaran gagal ditutup di Mayar: ${err.message}`;
        console.error(`[Mayar] close ${order.paymentLinkId} gagal:`, err.message);
      }
    }

    order.deletedAt = new Date();
    await order.save();

    res.json({ message: mayarWarning || 'Order dihapus', warning: Boolean(mayarWarning) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/orders/:id/restore — admin: pulihkan order yang dihapus ───
// Link pembayaran yang sudah ditutup tidak ikut dibuka kembali; pembeli harus checkout ulang.
router.post('/:id/restore', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).setOptions({ withDeleted: true });
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (!order.deletedAt) return res.status(400).json({ message: 'Order ini tidak dalam keadaan terhapus' });

    order.deletedAt = null;
    await order.save();

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

    if (order.paymentStatus === 'paid') {
      // Mayar tidak menyediakan endpoint refund — dana dikembalikan manual oleh admin,
      // lalu ditandai 'refunded' dari panel admin.
      order.paymentStatus = 'refund_pending';
    } else if (order.paymentStatus === 'pending') {
      // Tutup link pembayarannya supaya pesanan yang sudah dibatalkan tidak bisa dibayar.
      if (order.paymentLinkId) {
        try {
          await closePayment(order.paymentLinkId);
        } catch (closeErr) {
          console.error('[Cancel] Mayar close payment failed:', closeErr.message);
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
        message: order.paymentStatus === 'refund_pending'
          ? `Pesanan ${order.orderCode} dibatalkan — wajib transfer refund Rp${order.total.toLocaleString('id-ID')}`
          : `Pesanan ${order.orderCode} dibatalkan oleh customer`,
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

// ─── PUT /api/orders/my/:id/refund-account — customer: rekening tujuan refund ───
// Masih bisa diperbarui selama uangnya belum ditransfer, supaya salah ketik nomor rekening
// tidak mengunci pembeli. Begitu admin menandai 'refunded', formulirnya tertutup.
router.put('/my/:id/refund-account', customerAuth, async (req, res) => {
  try {
    const { bankName, accountName, accountNumber } = req.body;
    const number = String(accountNumber ?? '').replace(/[\s-]/g, '');

    if (!bankName?.trim() || !accountName?.trim() || !number) {
      return res.status(400).json({ message: 'Nama bank, nama pemilik, dan nomor rekening wajib diisi' });
    }
    if (!/^\d{6,20}$/.test(number)) {
      return res.status(400).json({ message: 'Nomor rekening harus 6–20 digit angka' });
    }

    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (order.paymentStatus !== 'refund_pending') {
      return res.status(400).json({ message: 'Pesanan ini tidak sedang menunggu refund' });
    }

    const isFirst = !order.refundAccount?.submittedAt;
    order.refundAccount = {
      bankName: bankName.trim(),
      accountName: accountName.trim(),
      accountNumber: number,
      submittedAt: new Date(),
    };
    await order.save();

    try {
      // Nomor rekening sengaja tidak ikut ke notifikasi — cukup tautan ke halaman pesanan.
      await notifyAdmin({
        type: 'refund_account',
        title: isFirst ? 'Rekening refund diterima' : 'Rekening refund diperbarui',
        message: `Pesanan ${order.orderCode} — rekening tujuan refund sudah diisi pembeli`,
        link: `/admin/orders/${order._id}`,
        relatedId: order._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] refund account notify failed:', notifyErr.message);
    }

    res.json(order);
  } catch (err) {
    console.error('[Refund Account]', err);
    res.status(500).json({ message: 'Gagal menyimpan rekening refund' });
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
    await markOrderShipped(order, req.body.trackingCode);
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
      await order.save();
    } else {
      const tracking = await getOrderTracking(order.biteshipOrderId);
      await applyBiteshipTracking(order, tracking);
    }

    res.json(order);
  } catch (err) {
    console.error('[Sync Biteship]', err.message);
    res.status(502).json({ message: 'Gagal sinkronisasi dengan Biteship' });
  }
});

// Status Biteship yang berarti barang sudah di tangan kurir. 'confirmed', 'allocated', dan
// 'picking_up' belum — kurir baru dijadwalkan menjemput, barang masih di gudang.
const BITESHIP_SHIPPED_STATUSES = new Set(['picked', 'in_transit', 'dropping_off']);

// ─── Shared: rekam satu update pengiriman dari Biteship ───
// Webhook dan polling mengirim status yang sama berkali-kali, jadi entri identik
// (status + catatan + waktu) dibuang supaya timeline tidak menggandakan diri.
function recordShipmentEvent(order, { status, note, updatedAt }) {
  const cleanStatus = (status ?? '').trim();
  if (!cleanStatus) return;

  const parsed = updatedAt ? new Date(updatedAt) : new Date();
  const stamp = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const cleanNote = (note ?? '').trim();

  const duplicate = (order.shipmentHistory ?? []).some(
    (e) =>
      e.status === cleanStatus &&
      (e.note ?? '') === cleanNote &&
      e.updatedAt?.getTime() === stamp.getTime()
  );
  if (!duplicate) order.shipmentHistory.push({ status: cleanStatus, note: cleanNote, updatedAt: stamp });

  order.biteshipStatus = cleanStatus;
}

// ─── Shared: serap payload tracking Biteship ke order (sync manual admin dan cron) ───
async function applyBiteshipTracking(order, tracking) {
  for (const h of tracking?.courier?.history ?? []) {
    recordShipmentEvent(order, { status: h.status, note: h.note, updatedAt: h.updated_at });
  }
  if (tracking?.status) order.biteshipStatus = tracking.status;

  const waybill = tracking?.courier?.waybill_id || tracking?.waybill_id || '';
  const trackingId = tracking?.courier?.tracking_id || '';
  if (waybill) order.biteshipWaybillId = waybill;
  if (trackingId) order.biteshipTrackingCode = trackingId;

  await order.save();

  if (tracking?.status === 'delivered') {
    await markOrderDelivered(order);
  } else if (BITESHIP_SHIPPED_STATUSES.has(tracking?.status)) {
    await markOrderShipped(order, trackingId || waybill);
  }
}

// ─── Shared: mark an order shipped + notify customer (used by the admin route and the webhook) ───
async function markOrderShipped(order, trackingCode) {
  if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) return;
  order.orderStatus = 'shipped';
  if (trackingCode) order.biteshipTrackingCode = trackingCode;
  await order.save();
  try {
    await notifyCustomer({
      customerId: order.customer,
      type: 'order_shipped',
      title: 'Pesanan sedang dikirim',
      message: `Pesananmu sedang dalam perjalanan${
        order.biteshipTrackingCode ? ` — resi: ${order.biteshipTrackingCode}` : ''
      }`,
      link: `/pesanan/${order._id}`,
      relatedId: order._id,
    });
  } catch (notifyErr) {
    console.error('[Notify] ship notify failed:', notifyErr.message);
  }
}

// ─── Shared: mark an order delivered + notify customer (used by webhook and the Biteship sync job) ───
async function markOrderDelivered(order) {
  if (order.orderStatus === 'delivered') return;
  order.orderStatus = 'delivered';
  order.deliveredAt = new Date();
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

// ─── Biteship webhook (registered in server.js before express-json routes) ───
const biteshipWebhookHandler = async (req, res) => {
  try {
    const { event, data } = req.body ?? {};
    if (event !== 'order.status_update' || !data?.id) {
      return res.status(200).json({ message: 'OK' });
    }

    const order = await Order.findOne({ biteshipOrderId: data.id });
    if (!order) {
      console.error(`[Biteship Webhook] order untuk biteshipOrderId ${data.id} tidak ditemukan`);
      return res.status(200).json({ message: 'OK' });
    }

    // Setiap status direkam, termasuk yang tidak menggeser orderStatus ('allocated',
    // 'picking_up', 'on_hold', …). Itulah yang membuat halaman pesanan bisa bercerita
    // lebih rinci daripada lima langkah besar.
    recordShipmentEvent(order, {
      status: data.status,
      note: data.note ?? data.status_note ?? '',
      updatedAt: data.updated_at,
    });

    const waybill = data.courier_waybill_id ?? data.courier_tracking_id ?? '';
    if (waybill && !order.biteshipWaybillId) order.biteshipWaybillId = waybill;
    await order.save();

    if (data.status === 'delivered') {
      await markOrderDelivered(order);
    } else if (BITESHIP_SHIPPED_STATUSES.has(data.status)) {
      await markOrderShipped(order, waybill);
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
module.exports.markOrderDelivered = markOrderDelivered;
module.exports.applyBiteshipTracking = applyBiteshipTracking;
module.exports.syncPaymentStatus = syncPaymentStatus;
