const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const customerAuth = require('../middleware/customerAuth');
const upload = require('../middleware/upload');
const { notifyAdmin, notifyCustomer } = require('../utils/notify');
const { createOrder: biteshipCreateOrder } = require('../services/biteshipService');

const COMPLAINT_WINDOW_DAYS = 3;

const STATUS_LABEL_ID = {
  open: 'Menunggu',
  processing: 'Diproses',
  awaiting_return_shipment: 'Retur disetujui, menunggu kamu kirim barang',
  return_shipped: 'Barang retur dalam perjalanan',
  return_received: 'Barang retur diterima, menunggu resolusi',
  resolved: 'Selesai',
  rejected: 'Ditolak',
};

// ─── POST /api/complaints — customer create complaint ───
router.post('/', customerAuth, upload.array('photos', 5), async (req, res) => {
  try {
    const { orderId, type, reason } = req.body;

    if (!orderId || !type || !reason) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }
    if (!['complaint', 'return'].includes(type)) {
      return res.status(400).json({ message: 'Tipe tidak valid' });
    }
    if (reason.trim().length < 10) {
      return res.status(400).json({ message: 'Alasan minimal 10 karakter' });
    }

    const order = await Order.findOne({ _id: orderId, customer: req.customer._id });
    if (!order) return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({ message: 'Komplain hanya bisa dibuat setelah pesanan diterima' });
    }

    // Order lama belum punya deliveredAt, jadi updatedAt tetap dipakai sebagai cadangan.
    const deliveredAt = order.deliveredAt ?? order.updatedAt;
    const windowMs = COMPLAINT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(deliveredAt).getTime() > windowMs) {
      return res.status(400).json({ message: `Batas waktu komplain (${COMPLAINT_WINDOW_DAYS} hari setelah diterima) telah berlewat` });
    }

    const existing = await Complaint.findOne({ order: orderId, customer: req.customer._id });
    if (existing) return res.status(400).json({ message: 'Kamu sudah membuat komplain untuk pesanan ini' });

    const photos = (req.files || []).map((f) => f.path || f.filename || '');

    const complaint = await Complaint.create({
      order: orderId,
      customer: req.customer._id,
      customerSnapshot: { name: req.customer.name, email: req.customer.email },
      type,
      reason: reason.trim(),
      photos,
    });

    try {
      await notifyAdmin({
        type: 'complaint_new',
        title: type === 'return' ? 'Permintaan retur baru' : 'Komplain baru',
        message: `${req.customer.name}: ${reason.trim().substring(0, 60)}`,
        link: `/admin/complaints?id=${complaint._id}`,
        relatedId: complaint._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] complaint notify failed:', notifyErr.message);
    }

    res.status(201).json(complaint);
  } catch (err) {
    console.error('[Complaint Create]', err);
    res.status(500).json({ message: 'Gagal membuat komplain' });
  }
});

// ─── GET /api/complaints/my — customer's complaints ───
router.get('/my', customerAuth, async (req, res) => {
  try {
    const complaints = await Complaint.find({ customer: req.customer._id })
      .sort({ createdAt: -1 })
      .populate('order', '_id orderCode total');
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/complaints/my/order/:orderId — check if complaint exists for order ───
router.get('/my/order/:orderId', customerAuth, async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      order: req.params.orderId,
      customer: req.customer._id,
    });
    res.json(complaint ?? null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/complaints/:id/ship-return — customer: confirm return shipment ───
router.put('/:id/ship-return', customerAuth, async (req, res) => {
  try {
    const { courier, trackingNumber } = req.body;
    if (!courier?.trim() || !trackingNumber?.trim()) {
      return res.status(400).json({ message: 'Kurir dan nomor resi wajib diisi' });
    }

    const complaint = await Complaint.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!complaint) return res.status(404).json({ message: 'Komplain tidak ditemukan' });
    if (complaint.type !== 'return') {
      return res.status(400).json({ message: 'Hanya retur yang bisa mengirim resi kembali' });
    }
    if (complaint.status !== 'awaiting_return_shipment') {
      return res.status(400).json({ message: 'Retur ini belum disetujui atau resi sudah dikirim' });
    }

    complaint.returnShipment = {
      courier: courier.trim(),
      trackingNumber: trackingNumber.trim(),
      shippedAt: new Date(),
    };
    complaint.status = 'return_shipped';
    await complaint.save();

    try {
      await notifyAdmin({
        type: 'complaint_new',
        title: 'Resi retur dikirim customer',
        message: `${req.customer.name} mengirim resi retur: ${courier.trim()} - ${trackingNumber.trim()}`,
        link: `/admin/complaints?id=${complaint._id}`,
        relatedId: complaint._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] ship-return notify failed:', notifyErr.message);
    }

    res.json(complaint);
  } catch (err) {
    console.error('[Complaint Ship-Return]', err);
    res.status(500).json({ message: 'Gagal mengirim data resi retur' });
  }
});

// ─── GET /api/complaints — admin: all complaints ───
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const total = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('order', '_id orderCode total');
    res.json({ data: complaints, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/complaints/:id — admin: single complaint ───
router.get('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('order');
    if (!complaint) return res.status(404).json({ message: 'Komplain tidak ditemukan' });
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/complaints/:id — admin: update status/note/resolution ───
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, adminNote, resolution } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Komplain tidak ditemukan' });

    if (status === 'resolved' && complaint.type === 'return') {
      if (!resolution || !['refund', 'replace'].includes(resolution.type)) {
        return res.status(400).json({ message: 'Pilih jenis resolusi: refund atau ganti barang' });
      }
      complaint.resolution = { type: resolution.type, note: resolution.note || '' };
    }

    const previousStatus = complaint.status;
    if (status) complaint.status = status;
    if (adminNote !== undefined) complaint.adminNote = adminNote;
    if (status === 'resolved' || status === 'rejected') complaint.resolvedAt = new Date();

    await complaint.save();

    // Mayar tidak punya endpoint refund, jadi uangnya dikirim manual. Order dipindah ke
    // refund_pending supaya kewajiban itu muncul di panel admin, sama seperti jalur
    // pembatalan pesanan — tanpa ini resolusi refund hanya jadi catatan di komplain.
    if (status === 'resolved' && complaint.resolution?.type === 'refund') {
      const order = await Order.findById(complaint.order);
      if (order && order.paymentStatus === 'paid') {
        order.paymentStatus = 'refund_pending';
        await order.save();
        try {
          await notifyAdmin({
            type: 'complaint_update',
            title: 'Refund komplain menunggu transfer',
            message: `Pesanan ${order.orderCode} — transfer refund Rp${order.total.toLocaleString('id-ID')}`,
            link: `/admin/orders/${order._id}`,
            relatedId: order._id,
          });
        } catch (notifyErr) {
          console.error('[Notify] refund pending notify failed:', notifyErr.message);
        }
      }
    }

    if (status && status !== previousStatus) {
      try {
        await notifyCustomer({
          customerId: complaint.customer,
          type: 'complaint_update',
          title: complaint.type === 'return' ? 'Update status retur' : 'Update status komplain',
          message: `Status ${complaint.type === 'return' ? 'retur' : 'komplain'} kamu: ${STATUS_LABEL_ID[status] ?? status}`,
          link: `/pesanan/${complaint.order}`,
          relatedId: complaint._id,
        });
      } catch (notifyErr) {
        console.error('[Notify] complaint status notify failed:', notifyErr.message);
      }
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/complaints/:id/ship-replacement — admin: kirim barang pengganti ───
router.post('/:id/ship-replacement', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Komplain tidak ditemukan' });
    if (complaint.resolution?.type !== 'replace') {
      return res.status(400).json({ message: 'Hanya komplain dengan resolusi ganti barang yang bisa dikirim penggantinya' });
    }
    if (complaint.replacementShipment?.biteshipOrderId) {
      return res.status(400).json({ message: 'Barang pengganti untuk komplain ini sudah dikirim' });
    }

    const order = await Order.findById(complaint.order);
    if (!order) return res.status(404).json({ message: 'Pesanan tidak ditemukan' });

    // Barang pengganti memakai alamat, kurir, dan item yang sama dengan pesanan asli.
    const shipment = await biteshipCreateOrder(order);

    complaint.replacementShipment = {
      biteshipOrderId: shipment.id ?? '',
      trackingCode: shipment.courier?.tracking_id ?? '',
      waybillId: shipment.courier?.waybill_id ?? '',
      courier: order.shippingCourier,
      service: order.shippingServiceName || order.shippingService,
      shippedAt: new Date(),
    };
    await complaint.save();

    try {
      await notifyCustomer({
        customerId: complaint.customer,
        type: 'complaint_update',
        title: 'Barang pengganti dikirim',
        message: complaint.replacementShipment.trackingCode
          ? `Barang pengganti dalam perjalanan — resi: ${complaint.replacementShipment.trackingCode}`
          : 'Barang pengganti sedang disiapkan kurir',
        link: `/pesanan/${complaint.order}`,
        relatedId: complaint._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] replacement notify failed:', notifyErr.message);
    }

    res.json(complaint);
  } catch (err) {
    if (err.response || err.request) {
      console.error('[Complaint Ship-Replacement] Biteship error:', JSON.stringify(err.response?.data ?? err.message));
      return res.status(502).json({ message: 'Gagal memesan pengiriman pengganti ke Biteship' });
    }
    console.error('[Complaint Ship-Replacement]', err);
    res.status(500).json({ message: 'Gagal mengirim barang pengganti' });
  }
});

module.exports = router;
