const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/promotions — all promotions sorted by displayOrder
router.get('/', async (req, res) => {
  try {
    const promotions = await Promotion.find().sort({ displayOrder: 1, createdAt: -1 });
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/promotions/active — visible + date valid, sorted by displayOrder
// Must come BEFORE /:id
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const promotions = await Promotion.find({
      isVisible: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ displayOrder: 1 });
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/promotions/:id
router.get('/:id', async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });
    res.json(promo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/promotions — create
router.post('/', auth, upload.single('bannerImage'), async (req, res) => {
  try {
    const { name, description, startDate, endDate, type, productIds, categoryId, discountPercent, isVisible, displayOrder } = req.body;
    const promo = new Promotion({
      name,
      description,
      bannerImage: req.file ? req.file.path : '',
      startDate,
      endDate,
      type,
      productIds: productIds ? JSON.parse(productIds) : [],
      categoryId: categoryId || null,
      discountPercent: Number(discountPercent),
      isVisible: isVisible !== undefined ? isVisible === 'true' : true,
      displayOrder: Number(displayOrder) || 0,
    });
    await promo.save();
    res.status(201).json(promo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/promotions/reorder — batch update displayOrder
// Must come BEFORE /:id
router.put('/reorder', auth, async (req, res) => {
  try {
    const updates = req.body; // [{ id, displayOrder }]
    await Promise.all(
      updates.map(({ id, displayOrder }) =>
        Promotion.findByIdAndUpdate(id, { displayOrder })
      )
    );
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/promotions/:id — update
router.put('/:id', auth, upload.single('bannerImage'), async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });
    const { name, description, startDate, endDate, type, productIds, categoryId, discountPercent, isVisible, displayOrder } = req.body;
    if (name !== undefined) promo.name = name;
    if (description !== undefined) promo.description = description;
    if (req.file) promo.bannerImage = req.file.path;
    if (startDate) promo.startDate = startDate;
    if (endDate) promo.endDate = endDate;
    if (type) promo.type = type;
    if (productIds !== undefined) promo.productIds = JSON.parse(productIds);
    if (categoryId !== undefined) promo.categoryId = categoryId || null;
    if (discountPercent !== undefined) promo.discountPercent = Number(discountPercent);
    if (isVisible !== undefined) promo.isVisible = isVisible === 'true';
    if (displayOrder !== undefined) promo.displayOrder = Number(displayOrder);
    await promo.save();
    res.json(promo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/promotions/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/promotions/:id/toggle — flip isVisible
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });
    promo.isVisible = !promo.isVisible;
    await promo.save();
    res.json({ isVisible: promo.isVisible });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
