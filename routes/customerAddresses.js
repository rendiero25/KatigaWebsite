const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const customerAuth = require('../middleware/customerAuth');

router.use(customerAuth);

router.get('/', async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id).select('addresses');
    res.json(customer.addresses ?? []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { label, recipientName, phone, street, city, province, postalCode, areaId, areaName, isDefault } = req.body;
    const customer = await Customer.findById(req.customer._id);

    if (isDefault) {
      for (const a of customer.addresses) a.isDefault = false;
    }

    customer.addresses.push({ label, recipientName, phone, street, city, province, postalCode, areaId, areaName, isDefault: !!isDefault });

    if (isDefault) {
      customer.defaultAddress = { recipientName, phone, street, city, province, postalCode, areaId, areaName };
    }

    await customer.save();
    const newAddr = customer.addresses[customer.addresses.length - 1];
    res.status(201).json(newAddr);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { label, recipientName, phone, street, city, province, postalCode, areaId, areaName, isDefault } = req.body;
    const customer = await Customer.findById(req.customer._id);
    const addr = customer.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: 'Alamat tidak ditemukan' });

    if (isDefault) {
      for (const a of customer.addresses) a.isDefault = false;
    }

    Object.assign(addr, { label, recipientName, phone, street, city, province, postalCode, areaId, areaName, isDefault: !!isDefault });

    if (isDefault) {
      customer.defaultAddress = { recipientName, phone, street, city, province, postalCode, areaId, areaName };
    }

    await customer.save();
    res.json(addr);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    const addr = customer.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: 'Alamat tidak ditemukan' });
    addr.deleteOne();
    await customer.save();
    res.json({ message: 'Alamat dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/default', async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    const addr = customer.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: 'Alamat tidak ditemukan' });

    for (const a of customer.addresses) a.isDefault = false;
    addr.isDefault = true;
    customer.defaultAddress = {
      recipientName: addr.recipientName,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      province: addr.province,
      postalCode: addr.postalCode,
      areaId: addr.areaId,
      areaName: addr.areaName,
    };

    await customer.save();
    res.json(addr);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
