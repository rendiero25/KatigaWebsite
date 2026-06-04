const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const customerAuth = require('../middleware/customerAuth');

const signToken = (id) => {
  const secret = process.env.JWT_CUSTOMER_SECRET || process.env.JWT_SECRET;
  return jwt.sign({ id, role: 'customer' }, secret, { expiresIn: '7d' });
};

// POST /api/customers/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }
    const exists = await Customer.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }
    const customer = await Customer.create({ name, email, password, phone });
    const token = signToken(customer._id);
    res.status(201).json({ token, customer: { _id: customer._id, name: customer.name, email: customer.email, phone: customer.phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/customers/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ email });
    if (!customer || !(await customer.matchPassword(password))) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    const token = signToken(customer._id);
    res.json({ token, customer: { _id: customer._id, name: customer.name, email: customer.email, phone: customer.phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/customers/me
router.get('/me', customerAuth, async (req, res) => {
  res.json(req.customer);
});

// PUT /api/customers/me
router.put('/me', customerAuth, async (req, res) => {
  try {
    const { name, phone, defaultAddress } = req.body;
    const customer = await Customer.findById(req.customer._id);
    if (name) customer.name = name;
    if (phone) customer.phone = phone;
    if (defaultAddress) customer.defaultAddress = defaultAddress;
    await customer.save();
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
