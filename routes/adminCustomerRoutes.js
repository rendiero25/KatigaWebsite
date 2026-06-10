const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

// Helper: escape special regex characters in user input
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/admin/customers?search=&page=1&limit=20
router.get('/', auth, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const query = search
      ? { $or: [
          { name: { $regex: escapeRegex(search), $options: 'i' } },
          { email: { $regex: escapeRegex(search), $options: 'i' } },
        ]}
      : {};
    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.json({ customers, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/customers/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).select('-password');
    if (!customer) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/customers/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, phone, suspended } = req.body;
    if (email) {
      const existing = await Customer.findOne({ email, _id: { $ne: req.params.id } });
      if (existing) return res.status(400).json({ message: 'Email sudah digunakan' });
    }
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, suspended },
      { new: true, runValidators: true }
    ).select('-password');
    if (!customer) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/customers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json({ message: 'User berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/customers/:id/reset-password
router.post('/:id/reset-password', auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'User tidak ditemukan' });
    customer.password = password; // pre('save') hook in Customer model will hash this
    await customer.save();
    res.json({ message: 'Password berhasil direset' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
