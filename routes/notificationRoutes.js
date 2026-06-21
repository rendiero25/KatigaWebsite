const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');
const customerAuth = require('../middleware/customerAuth');
const { registerConnection } = require('../utils/notify');

// EventSource can't send custom headers, so the stream routes read the token from the query string.
const streamAuthAdmin = async (req, res, next) => {
  try {
    const decoded = jwt.verify(req.query.token || '', process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(401).end();
    req.admin = admin;
    next();
  } catch {
    res.status(401).end();
  }
};

const streamAuthCustomer = async (req, res, next) => {
  try {
    const secret = process.env.JWT_CUSTOMER_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(req.query.token || '', secret);
    if (decoded.role !== 'customer') return res.status(401).end();
    const customer = await Customer.findById(decoded.id).select('-password');
    if (!customer) return res.status(401).end();
    req.customer = customer;
    next();
  } catch {
    res.status(401).end();
  }
};

function sseHandler(recipientType, getRecipientId) {
  return (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(':ok\n\n');

    const unregister = registerConnection(recipientType, getRecipientId(req), res);
    req.on('close', unregister);
  };
}

// ─── Admin ───
router.get('/admin', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const filter = { recipientType: 'admin' };
    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(filter),
    ]);
    res.json({ notifications, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/admin/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipientType: 'admin', isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/admin/:id/read', auth, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientType: 'admin' },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notifikasi tidak ditemukan' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/admin/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ recipientType: 'admin', isRead: false }, { isRead: true });
    res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/admin/stream', streamAuthAdmin, sseHandler('admin', () => null));

// ─── Customer ───
router.get('/me', customerAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const filter = { recipientType: 'customer', recipientId: req.customer._id };
    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(filter),
    ]);
    res.json({ notifications, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me/unread-count', customerAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientType: 'customer',
      recipientId: req.customer._id,
      isRead: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/me/:id/read', customerAuth, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientType: 'customer', recipientId: req.customer._id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notifikasi tidak ditemukan' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/me/read-all', customerAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientType: 'customer', recipientId: req.customer._id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me/stream', streamAuthCustomer, sseHandler('customer', (req) => req.customer._id.toString()));

module.exports = router;
