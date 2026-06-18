const express = require('express');
const router = express.Router();
const Voucher = require('../models/Voucher');
const Order = require('../models/Order');
const customerAuth = require('../middleware/customerAuth');

const fmtRp = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

router.post('/validate', customerAuth, async (req, res) => {
  try {
    const { code, subtotal } = req.body;
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

    let discountAmount = voucher.discountType === 'percent'
      ? Math.round(Number(subtotal) * voucher.discountValue / 100)
      : voucher.discountValue;

    if (voucher.discountType === 'percent' && voucher.maxDiscount != null && voucher.maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, voucher.maxDiscount);
    }
    discountAmount = Math.min(discountAmount, Number(subtotal));

    res.json({
      valid: true,
      voucherId: voucher._id,
      discountAmount,
      message: `Hemat ${fmtRp(discountAmount)}`,
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: err.message });
  }
});

module.exports = router;
