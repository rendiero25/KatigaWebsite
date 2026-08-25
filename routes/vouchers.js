const express = require('express');
const router = express.Router();
const Voucher = require('../models/Voucher');
const Order = require('../models/Order');
const Product = require('../models/Product');
const customerAuth = require('../middleware/customerAuth');
const auth = require('../middleware/auth');
const { computeVoucherDiscount, eligibleSubtotal } = require('../utils/voucherScope');

const fmtRp = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// Kategori item tidak dikirim klien — dibaca dari database supaya cakupan voucher
// tidak bisa dimanipulasi dari sisi pembeli.
const resolveScopeItems = async (rawItems) => {
  const list = Array.isArray(rawItems) ? rawItems : [];
  if (!list.length) return [];

  const ids = [...new Set(list.map((i) => String(i.productId || '')).filter(Boolean))];
  const products = ids.length
    ? await Product.find({ _id: { $in: ids } }).select('_id category')
    : [];
  const categoryByProduct = new Map(
    products.map((p) => [String(p._id), p.category ? String(p.category) : '']),
  );

  return list.map((i) => ({
    productId: String(i.productId || ''),
    categoryId: categoryByProduct.get(String(i.productId || '')) || '',
    subtotal: Number(i.subtotal || 0),
  }));
};

// ─── Publik/pembeli: cek kode voucher ───
router.post('/validate', customerAuth, async (req, res) => {
  try {
    const { code, subtotal, items } = req.body;
    if (!code || subtotal === undefined) {
      return res.status(400).json({ valid: false, message: 'Data tidak lengkap' });
    }

    const voucher = await Voucher.findOne({ code: code.toUpperCase().trim() });
    if (!voucher) return res.json({ valid: false, message: 'Kode voucher tidak ditemukan' });
    if (!voucher.isActive) return res.json({ valid: false, message: 'Voucher tidak aktif' });

    const now = new Date();
    if (now < voucher.startDate) return res.json({ valid: false, message: 'Voucher belum berlaku' });
    if (now > voucher.endDate) return res.json({ valid: false, message: 'Voucher sudah berakhir' });
    if (Number(subtotal) < voucher.minOrderAmount) {
      return res.json({ valid: false, message: `Min. pembelian ${fmtRp(voucher.minOrderAmount)}` });
    }
    if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
      return res.json({ valid: false, message: 'Voucher sudah habis digunakan' });
    }

    if (voucher.perUserLimit > 0) {
      const userUsage = await Order.countDocuments({
        customer: req.customer._id,
        voucherCode: voucher.code,
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
      if (userUsage >= voucher.perUserLimit) {
        return res.json({ valid: false, message: 'Kamu sudah menggunakan voucher ini' });
      }
    }

    // Tanpa rincian item, voucher bercakupan tidak bisa dihitung dengan benar.
    const scopeItems = await resolveScopeItems(items);
    const basis = scopeItems.length
      ? scopeItems
      : [{ productId: '', categoryId: '', subtotal: Number(subtotal) }];

    if (voucher.appliesTo !== 'all' && !scopeItems.length) {
      return res.json({ valid: false, message: 'Voucher ini hanya berlaku untuk produk tertentu' });
    }

    const base = eligibleSubtotal(voucher, basis);
    if (base <= 0) {
      return res.json({
        valid: false,
        message: 'Tidak ada produk di keranjang yang memenuhi syarat voucher ini',
      });
    }

    const discountAmount = computeVoucherDiscount(voucher, basis);

    res.json({
      valid: true,
      voucherId: voucher._id,
      discountAmount,
      eligibleSubtotal: base,
      message: `Hemat ${fmtRp(discountAmount)}`,
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: err.message });
  }
});

// ─── Admin: daftar voucher ───
router.get('/', auth, async (req, res) => {
  try {
    const vouchers = await Voucher.find()
      .sort({ createdAt: -1 })
      .populate('products', 'name')
      .populate('categories', 'name');
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const parseBody = (body) => {
  const appliesTo = ['all', 'products', 'categories'].includes(body.appliesTo) ? body.appliesTo : 'all';
  return {
    code: String(body.code || '').toUpperCase().trim(),
    name: String(body.name || '').trim(),
    description: String(body.description || '').trim(),
    // Nilai voucher selalu persen; 'fixed' tidak dipakai lagi dari panel admin.
    discountType: 'percent',
    discountValue: Number(body.discountValue) || 0,
    minOrderAmount: Number(body.minOrderAmount) || 0,
    maxDiscount: body.maxDiscount === '' || body.maxDiscount == null ? null : Number(body.maxDiscount),
    usageLimit: Number(body.usageLimit) || 0,
    perUserLimit: Number(body.perUserLimit) || 0,
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
    isActive: body.isActive !== false,
    appliesTo,
    products: appliesTo === 'products' ? (body.products || []) : [],
    categories: appliesTo === 'categories' ? (body.categories || []) : [],
  };
};

const validate = (data) => {
  if (!data.code) return 'Kode voucher wajib diisi';
  if (!data.name) return 'Nama voucher wajib diisi';
  if (!(data.discountValue > 0 && data.discountValue <= 100)) return 'Diskon harus antara 1 dan 100 persen';
  if (!data.startDate || Number.isNaN(data.startDate.getTime())) return 'Tanggal mulai tidak valid';
  if (!data.endDate || Number.isNaN(data.endDate.getTime())) return 'Tanggal berakhir tidak valid';
  if (data.endDate < data.startDate) return 'Tanggal berakhir mendahului tanggal mulai';
  if (data.appliesTo === 'products' && !data.products.length) return 'Pilih minimal satu produk';
  if (data.appliesTo === 'categories' && !data.categories.length) return 'Pilih minimal satu kategori';
  return null;
};

// ─── Admin: buat voucher ───
router.post('/', auth, async (req, res) => {
  try {
    const data = parseBody(req.body);
    const error = validate(data);
    if (error) return res.status(400).json({ message: error });

    const exists = await Voucher.findOne({ code: data.code });
    if (exists) return res.status(400).json({ message: 'Kode voucher sudah dipakai' });

    const voucher = await Voucher.create(data);
    res.status(201).json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: ubah voucher ───
router.put('/:id', auth, async (req, res) => {
  try {
    const data = parseBody(req.body);
    const error = validate(data);
    if (error) return res.status(400).json({ message: error });

    const clash = await Voucher.findOne({ code: data.code, _id: { $ne: req.params.id } });
    if (clash) return res.status(400).json({ message: 'Kode voucher sudah dipakai' });

    // usedCount tidak pernah ditimpa dari form — itu penghitung pemakaian nyata.
    const voucher = await Voucher.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!voucher) return res.status(404).json({ message: 'Voucher tidak ditemukan' });
    res.json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin: hapus voucher ───
router.delete('/:id', auth, async (req, res) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Voucher tidak ditemukan' });
    res.json({ message: 'Voucher dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
