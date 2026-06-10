const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const customerAuth = require('../middleware/customerAuth');
const { sendWelcomeEmail } = require('../services/emailService');

const signToken = (id) => {
  const secret = process.env.JWT_CUSTOMER_SECRET || process.env.JWT_SECRET;
  return jwt.sign({ id, role: 'customer' }, secret, { expiresIn: '7d' });
};

// POST /api/customers/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nama, email, dan password wajib diisi' });
    }
    const exists = await Customer.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }
    const customer = await Customer.create({ name, email, password, phone: phone || '' });
    sendWelcomeEmail(customer.name, customer.email);
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

// POST /api/customers/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Credential wajib diisi' });

    const { data: payload } = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (payload.email_verified === 'false' || !payload.email_verified) {
      return res.status(401).json({ message: 'Token Google tidak valid' });
    }
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: 'Token Google tidak valid' });
    }

    const { sub: googleId, email, name } = payload;

    let customer = await Customer.findOne({ $or: [{ googleId }, { email }] });
    let isNew = false;

    if (!customer) {
      customer = await Customer.create({ name, email, googleId, phone: '' });
      isNew = true;
    } else if (!customer.googleId) {
      customer.googleId = googleId;
      await customer.save();
    }

    if (isNew) sendWelcomeEmail(customer.name, customer.email);

    const token = signToken(customer._id);
    res.json({ token, customer: { _id: customer._id, name: customer.name, email: customer.email, phone: customer.phone }, isNew });
  } catch (err) {
    if (err.response?.status === 400) {
      return res.status(401).json({ message: 'Token Google tidak valid' });
    }
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
    if (phone !== undefined) customer.phone = phone;
    if (defaultAddress) customer.defaultAddress = defaultAddress;
    await customer.save();
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/customers/wishlist
router.get('/wishlist', customerAuth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id)
      .populate('wishlist', '_id name image images priceNumeric');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const wishlist = (customer.wishlist || []).filter(Boolean);
    res.json({ wishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/customers/wishlist/:productId
router.post('/wishlist/:productId', customerAuth, async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }
  try {
    const customer = await Customer.findById(req.customer._id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const alreadyIn = customer.wishlist.some(id => id.toString() === productId);
    if (!alreadyIn) {
      customer.wishlist.push(productId);
      await customer.save();
    }
    res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/customers/wishlist/:productId
router.delete('/wishlist/:productId', customerAuth, async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }
  try {
    const customer = await Customer.findById(req.customer._id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    customer.wishlist = customer.wishlist.filter(id => id.toString() !== productId);
    await customer.save();
    res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
