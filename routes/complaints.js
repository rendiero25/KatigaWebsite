const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const customerAuth = require('../middleware/customerAuth');
const upload = require('../middleware/upload');
const { notifyAdmin } = require('../utils/notify');

const COMPLAINT_WINDOW_DAYS = 3;

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

    const deliveredAt = order.updatedAt;
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
        link: `/admin/complaints/${complaint._id}`,
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
      .populate('order', '_id midtransOrderId total');
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
      .populate('order', '_id midtransOrderId total');
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

// ─── PUT /api/complaints/:id — admin: update status/note ───
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Komplain tidak ditemukan' });

    if (status) complaint.status = status;
    if (adminNote !== undefined) complaint.adminNote = adminNote;
    if (status === 'resolved' || status === 'rejected') complaint.resolvedAt = new Date();

    await complaint.save();
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
