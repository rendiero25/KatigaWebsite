# Promotion System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-managed promotion system that applies percentage discounts to products, renders as a banner + carousel section on the home page (above ManufacturingSection), and shows discounted prices site-wide.

**Architecture:** Backend computes `activePromotion` per product on each request by querying the Promotion collection and injecting a virtual field into product API responses. Frontend reads `activePromotion` on product objects and renders discounted prices where applicable. Admin manages promotions via two pages: CRUD management and display ordering/visibility.

**Tech Stack:** Node.js/Express/Mongoose, React/TypeScript/Vite, Swiper (carousel), @dnd-kit/core + @dnd-kit/sortable (drag-to-reorder), Tailwind CSS, Lucide React, Multer/Cloudinary (banner upload)

---

## File Map

| File | Action |
|------|--------|
| `models/Promotion.js` | Create |
| `routes/promotionRoutes.js` | Create |
| `server.js` | Modify — register promotion route |
| `routes/productRoutes.js` | Modify — inject `activePromotion` |
| `client/src/services/api.ts` | Modify — add promotion API methods |
| `client/src/hooks/useApi.ts` | Modify — add `usePromotions`, `useActivePromotions` |
| `client/src/pages/admin/Promotions.tsx` | Create |
| `client/src/pages/admin/PromosiTampilan.tsx` | Create |
| `client/src/components/AdminLayout.tsx` | Modify — add Promosi sidebar group |
| `client/src/App.tsx` | Modify — add two admin routes |
| `client/src/components/PromosiSection.tsx` | Create |
| `client/src/pages/Home.tsx` | Modify — add PromosiSection |
| `client/src/pages/ProductDetail.tsx` | Modify — show discounted price |
| `client/src/pages/Products.tsx` | Modify — show promo badge + price |
| `client/src/components/ProductsSection.tsx` | Modify — show promo badge + price |

---

### Task 1: Promotion Model

**Files:**
- Create: `models/Promotion.js`

- [ ] **Step 1: Create the model**

```js
const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  bannerImage: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  type: { type: String, enum: ['products', 'category'], required: true },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory', default: null },
  discountPercent: { type: Number, required: true, min: 1, max: 100 },
  isVisible: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Promotion', promotionSchema);
```

- [ ] **Step 2: Commit**

```bash
git add models/Promotion.js
git commit -m "feat: add Promotion model"
```

---

### Task 2: Promotion Routes

**Files:**
- Create: `routes/promotionRoutes.js`

**Important:** Static paths (`/active`, `/reorder`) MUST be defined before parameterized paths (`/:id`) to prevent Express matching "active"/"reorder" as an `:id` value.

- [ ] **Step 1: Create the route file**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add routes/promotionRoutes.js
git commit -m "feat: add promotion routes (CRUD, reorder, toggle)"
```

---

### Task 3: Register Route + Augment Product Responses

**Files:**
- Modify: `server.js`
- Modify: `routes/productRoutes.js`

- [ ] **Step 1: Register in server.js**

After line `app.use('/api/admin/reviews', require('./routes/adminReviewRoutes'));`, add:

```js
app.use('/api/promotions', require('./routes/promotionRoutes'));
```

- [ ] **Step 2: Add Promotion import to productRoutes.js**

After `const ProductCategory = require('../models/ProductCategory');`, add:

```js
const Promotion = require('../models/Promotion');
```

- [ ] **Step 3: Replace GET / handler in productRoutes.js**

Replace the entire `router.get('/', async (req, res) => { ... });` block with:

```js
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = {};

    if (category) {
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(category);
      if (isValidObjectId) {
        query.category = category;
      } else {
        const categoryDoc = await ProductCategory.findOne({
          name: { $regex: new RegExp(`^${category.trim()}$`, 'i') }
        });
        if (categoryDoc) {
          query.category = categoryDoc._id;
        } else {
          return res.json([]);
        }
      }
    }

    if (featured === 'true') query.isFeatured = true;

    const products = await Product.find(query).populate('category');

    const now = new Date();
    const activePromos = await Promotion.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    const promoByProduct = {};
    const promoByCategory = {};
    for (const promo of activePromos) {
      if (promo.type === 'products') {
        for (const pid of promo.productIds) {
          promoByProduct[pid.toString()] = { _id: promo._id, name: promo.name, discountPercent: promo.discountPercent };
        }
      } else if (promo.type === 'category' && promo.categoryId) {
        promoByCategory[promo.categoryId.toString()] = { _id: promo._id, name: promo.name, discountPercent: promo.discountPercent };
      }
    }

    const result = products.map(p => {
      const obj = p.toObject();
      obj.activePromotion =
        promoByProduct[p._id.toString()] ||
        promoByCategory[p.category?._id?.toString() ?? ''] ||
        null;
      return obj;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

- [ ] **Step 4: Replace GET /:id handler in productRoutes.js**

Replace the entire `router.get('/:id', async (req, res) => { ... });` block with:

```js
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const now = new Date();
    const activePromos = await Promotion.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    const obj = product.toObject();
    const promo = activePromos.find(p =>
      (p.type === 'products' && p.productIds.some(pid => pid.toString() === product._id.toString())) ||
      (p.type === 'category' && p.categoryId?.toString() === product.category?._id?.toString())
    );
    obj.activePromotion = promo
      ? { _id: promo._id, name: promo.name, discountPercent: promo.discountPercent }
      : null;

    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

- [ ] **Step 5: Verify server starts and products include activePromotion**

```bash
npm run dev
```

Open `http://localhost:5000/api/products` — each product should have `"activePromotion": null` (since no promos exist yet).
Open `http://localhost:5000/api/promotions` — returns `[]`.

- [ ] **Step 6: Commit**

```bash
git add server.js routes/productRoutes.js
git commit -m "feat: register promotion route and inject activePromotion into product responses"
```

---

### Task 4: Frontend API Methods + Hooks

**Files:**
- Modify: `client/src/services/api.ts`
- Modify: `client/src/hooks/useApi.ts`

- [ ] **Step 1: Add promotion methods to api.ts**

Add the following before the closing `};` of the `api` object (before the line `};` that ends the object, just after the `submitReview` method):

```ts
  // Promotions
  getPromotions: async () => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch promotions');
    return res.json();
  },

  getActivePromotions: async () => {
    const res = await fetch(`${API_BASE_URL}/promotions/active`);
    if (!res.ok) throw new Error('Failed to fetch active promotions');
    return res.json();
  },

  createPromotion: async (formData: FormData) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to create promotion');
    return res.json();
  },

  updatePromotion: async (id: string, formData: FormData) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to update promotion');
    return res.json();
  },

  deletePromotion: async (id: string) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete promotion');
    return res.json();
  },

  reorderPromotions: async (order: { id: string; displayOrder: number }[]) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error('Failed to reorder promotions');
    return res.json();
  },

  togglePromotion: async (id: string): Promise<{ isVisible: boolean }> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/promotions/${id}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to toggle promotion');
    return res.json();
  },
```

- [ ] **Step 2: Add hooks to useApi.ts**

Add at the end of `client/src/hooks/useApi.ts` (before the final newline):

```ts
export function usePromotions() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    api.getPromotions().then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useActivePromotions() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getActivePromotions().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
```

- [ ] **Step 3: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/services/api.ts client/src/hooks/useApi.ts
git commit -m "feat: add promotion API methods and hooks"
```

---

### Task 5: Install @dnd-kit

**Files:**
- Modify: `client/package.json` (via npm)

- [ ] **Step 1: Install packages**

```bash
cd client && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: Three packages added to `client/node_modules` and listed in `client/package.json` dependencies.

- [ ] **Step 2: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "chore: add @dnd-kit packages for drag-to-reorder"
```

---

### Task 6: Admin Promotions Page

**Files:**
- Create: `client/src/pages/admin/Promotions.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

interface Promotion {
  _id: string;
  name: string;
  description: string;
  bannerImage: string;
  startDate: string;
  endDate: string;
  type: 'products' | 'category';
  productIds: string[];
  categoryId: string | null;
  discountPercent: number;
  isVisible: boolean;
  displayOrder: number;
}

interface Product {
  _id: string;
  name: string;
  category: { _id: string; name: string } | null;
  priceNumeric: number;
  activePromotion: { _id: string; name: string; discountPercent: number } | null;
}

interface Category {
  _id: string;
  name: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const toInputDate = (iso: string) => (iso ? iso.slice(0, 10) : '');

const isActive = (promo: Promotion) => {
  const now = new Date();
  return new Date(promo.startDate) <= now && new Date(promo.endDate) >= now;
};

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<'products' | 'category'>('products');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('');
  const [pickerSort, setPickerSort] = useState<'name' | 'price'>('name');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const data = await api.getPromotions();
      setPromotions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromotions(); }, []);

  useEffect(() => {
    if (!showSheet) return;
    api.getProducts().then(setProducts);
    api.getCategories().then(setCategories);
  }, [showSheet]);

  const openCreate = () => {
    setEditing(null);
    setName(''); setDescription(''); setBannerFile(null); setBannerPreview('');
    setStartDate(''); setEndDate(''); setType('products');
    setSelectedProductIds([]); setSelectedCategoryId(''); setDiscountPercent('');
    setPickerSearch(''); setPickerCategory(''); setPickerSort('name');
    setError('');
    setShowSheet(true);
  };

  const openEdit = (promo: Promotion) => {
    setEditing(promo);
    setName(promo.name);
    setDescription(promo.description);
    setBannerFile(null);
    setBannerPreview(api.getImageUrl(promo.bannerImage));
    setStartDate(toInputDate(promo.startDate));
    setEndDate(toInputDate(promo.endDate));
    setType(promo.type);
    setSelectedProductIds(promo.productIds);
    setSelectedCategoryId(promo.categoryId || '');
    setDiscountPercent(String(promo.discountPercent));
    setPickerSearch(''); setPickerCategory(''); setPickerSort('name');
    setError('');
    setShowSheet(true);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Nama promosi wajib diisi'); return; }
    if (!startDate || !endDate) { setError('Durasi promosi wajib diisi'); return; }
    const pct = Number(discountPercent);
    if (!discountPercent || pct < 1 || pct > 100) { setError('Diskon harus antara 1–100%'); return; }
    if (type === 'products' && selectedProductIds.length === 0) { setError('Pilih minimal 1 produk'); return; }
    if (type === 'category' && !selectedCategoryId) { setError('Pilih kategori'); return; }

    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description);
      fd.append('startDate', startDate);
      fd.append('endDate', endDate);
      fd.append('type', type);
      fd.append('discountPercent', discountPercent);
      fd.append('productIds', JSON.stringify(type === 'products' ? selectedProductIds : []));
      fd.append('categoryId', type === 'category' ? selectedCategoryId : '');
      if (bannerFile) fd.append('bannerImage', bannerFile);

      if (editing) {
        await api.updatePromotion(editing._id, fd);
      } else {
        await api.createPromotion(fd);
      }
      setShowSheet(false);
      fetchPromotions();
    } catch (e: unknown) {
      setError((e as Error).message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus promosi ini?')) return;
    await api.deletePromotion(id);
    fetchPromotions();
  };

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(pickerSearch.toLowerCase()))
    .filter(p => (pickerCategory ? p.category?._id === pickerCategory : true))
    .sort((a, b) => pickerSort === 'price' ? a.priceNumeric - b.priceNumeric : a.name.localeCompare(b.name));

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <AdminLayout title="Kelola Promosi">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Daftar Promosi</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          + Tambah Promosi
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Belum ada promosi.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tipe</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Diskon</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Durasi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {promotions.map(promo => (
                <tr key={promo._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{promo.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {promo.type === 'products' ? 'Produk' : 'Kategori'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700">{promo.discountPercent}%</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDate(promo.startDate)} – {formatDate(promo.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    {isActive(promo) ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        {new Date(promo.startDate) > new Date() ? 'Akan datang' : 'Berakhir'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(promo)} className="text-indigo-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDelete(promo._id)} className="text-red-500 hover:underline text-xs">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSheet(false)} />
          <div className="relative ml-auto w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold">{editing ? 'Edit Promosi' : 'Tambah Promosi'}</h3>
              <button onClick={() => setShowSheet(false)} className="text-gray-500 hover:text-gray-900 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-5 flex-1">
              {error && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div>
                <label className={labelClass}>Nama Promosi *</label>
                <input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="Promo Lebaran 2026" />
              </div>

              <div>
                <label className={labelClass}>Deskripsi</label>
                <textarea className={inputClass} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Keterangan promosi..." />
              </div>

              <div>
                <label className={labelClass}>Banner</label>
                {bannerPreview && (
                  <img src={bannerPreview} alt="banner preview" className="w-full h-40 object-cover rounded-lg mb-2" />
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-indigo-600 hover:underline">
                  {bannerPreview ? 'Ganti gambar' : 'Upload banner'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tanggal Mulai *</label>
                  <input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Tanggal Berakhir *</label>
                  <input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Diskon (%) *</label>
                <input
                  type="number" min="1" max="100" className={inputClass}
                  value={discountPercent} onChange={e => setDiscountPercent(e.target.value)}
                  placeholder="20"
                />
              </div>

              <div>
                <label className={labelClass}>Tipe Seleksi Produk *</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" value="products" checked={type === 'products'} onChange={() => setType('products')} />
                    Pilih Produk
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" value="category" checked={type === 'category'} onChange={() => setType('category')} />
                    Pilih Kategori
                  </label>
                </div>
              </div>

              {type === 'category' ? (
                <div>
                  <label className={labelClass}>Kategori *</label>
                  <select className={inputClass} value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}>
                    <option value="">— Pilih kategori —</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className={labelClass}>
                    Produk *{' '}
                    <span className="text-gray-400 font-normal">({selectedProductIds.length} dipilih)</span>
                  </label>

                  <div className="flex gap-2 mb-3">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Cari produk..."
                      value={pickerSearch}
                      onChange={e => setPickerSearch(e.target.value)}
                    />
                    <select
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                      value={pickerCategory}
                      onChange={e => setPickerCategory(e.target.value)}
                    >
                      <option value="">Semua Kategori</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <select
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                      value={pickerSort}
                      onChange={e => setPickerSort(e.target.value as 'name' | 'price')}
                    >
                      <option value="name">Nama A–Z</option>
                      <option value="price">Harga</option>
                    </select>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-64">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 w-8"></th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Nama</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Kategori</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Harga</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Status Promo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map(p => {
                          const inOtherPromo = p.activePromotion && p.activePromotion._id !== editing?._id;
                          const checked = selectedProductIds.includes(p._id);
                          return (
                            <tr
                              key={p._id}
                              className={`cursor-pointer hover:bg-indigo-50 ${checked ? 'bg-indigo-50' : ''} ${inOtherPromo ? 'opacity-60' : ''}`}
                              onClick={() => { if (!inOtherPromo) toggleProduct(p._id); }}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!!inOtherPromo}
                                  onChange={() => { if (!inOtherPromo) toggleProduct(p._id); }}
                                  onClick={e => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-3 py-2 font-medium text-gray-900">{p.name}</td>
                              <td className="px-3 py-2 text-gray-500">{p.category?.name || '—'}</td>
                              <td className="px-3 py-2 text-gray-500">
                                {p.priceNumeric > 0 ? `Rp ${p.priceNumeric.toLocaleString('id-ID')}` : '—'}
                              </td>
                              <td className="px-3 py-2">
                                {inOtherPromo && (
                                  <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                    {p.activePromotion!.name}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end sticky bottom-0 bg-white">
              <button onClick={() => setShowSheet(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/Promotions.tsx
git commit -m "feat: add admin Promotions CRUD page with product picker, filter, and sort"
```

---

### Task 7: Admin PromosiTampilan Page

**Files:**
- Create: `client/src/pages/admin/PromosiTampilan.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

interface Promotion {
  _id: string;
  name: string;
  bannerImage: string;
  startDate: string;
  endDate: string;
  discountPercent: number;
  isVisible: boolean;
  displayOrder: number;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

interface SortableItemProps {
  promo: Promotion;
  onToggle: (id: string) => void;
}

function SortableItem({ promo, onToggle }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: promo._id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl mb-3 shadow-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-5" />
      </button>

      <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        {promo.bannerImage ? (
          <img src={api.getImageUrl(promo.bannerImage)} alt={promo.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-blue-100" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{promo.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDate(promo.startDate)} – {formatDate(promo.endDate)} &bull; {promo.discountPercent}% off
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onToggle(promo._id)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            promo.isVisible ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
          aria-label={promo.isVisible ? 'Sembunyikan' : 'Tampilkan'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              promo.isVisible ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-xs text-gray-500 w-20">
          {promo.isVisible ? 'Ditampilkan' : 'Tersembunyi'}
        </span>
      </div>
    </div>
  );
}

export default function PromosiTampilan() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    api.getPromotions()
      .then((data: Promotion[]) =>
        setPromotions([...data].sort((a, b) => a.displayOrder - b.displayOrder))
      )
      .finally(() => setLoading(false));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPromotions(prev => {
      const oldIdx = prev.findIndex(p => p._id === String(active.id));
      const newIdx = prev.findIndex(p => p._id === String(over.id));
      return arrayMove(prev, oldIdx, newIdx);
    });
    setSaved(false);
  };

  const handleToggle = async (id: string) => {
    const data = await api.togglePromotion(id);
    setPromotions(prev => prev.map(p => p._id === id ? { ...p, isVisible: data.isVisible } : p));
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const order = promotions.map((p, idx) => ({ id: p._id, displayOrder: idx }));
      await api.reorderPromotions(order);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Tampilan Promosi">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tampilan Promosi</h2>
          <p className="text-sm text-gray-500 mt-1">
            Drag untuk atur urutan. Toggle untuk show/hide di halaman home.
          </p>
        </div>
        <button
          onClick={handleSaveOrder}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {saving ? 'Menyimpan...' : saved ? '✓ Tersimpan' : 'Simpan Urutan'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          Belum ada promosi. Buat dulu di halaman Kelola Promosi.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={promotions.map(p => p._id)} strategy={verticalListSortingStrategy}>
            {promotions.map(promo => (
              <SortableItem key={promo._id} promo={promo} onToggle={handleToggle} />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </AdminLayout>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/PromosiTampilan.tsx
git commit -m "feat: add PromosiTampilan admin page with drag-and-drop reorder and visibility toggle"
```

---

### Task 8: AdminLayout Sidebar + App.tsx Routes

**Files:**
- Modify: `client/src/components/AdminLayout.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add Tag icon to AdminLayout.tsx imports**

In `client/src/components/AdminLayout.tsx`, find the lucide-react import block and add `Tag` to it:

```tsx
import {
  LayoutDashboard,
  Home,
  Info,
  Package,
  BookOpen,
  Newspaper,
  Phone,
  Settings,
  LogOut,
  ChevronRight,
  Layers,
  ShoppingCart,
  ExternalLink,
  Users as UsersIcon,
  MessageSquare,
  Tag,
} from 'lucide-react'
```

- [ ] **Step 2: Add Promosi group to menuGroups in AdminLayout.tsx**

In the `menuGroups` array, add a new group after the `'Transaksi'` group (the one with `orders`, `users`, `reviews`) and before the `'Sistem'` group:

```tsx
  {
    label: 'Promosi',
    items: [
      {
        path: '/admin/promosi-group',
        icon: Tag,
        label: 'Promosi',
        children: [
          { path: '/admin/promosi', label: 'Kelola Promosi' },
          { path: '/admin/promosi/tampilan', label: 'Tampilan Promosi' },
        ],
      },
    ],
  },
```

- [ ] **Step 3: Add imports to App.tsx**

After `import AdminReviews from './pages/admin/Reviews';`, add:

```tsx
import AdminPromotions from './pages/admin/Promotions';
import AdminPromosiTampilan from './pages/admin/PromosiTampilan';
```

- [ ] **Step 4: Add routes to App.tsx**

After `<Route path="/admin/reviews" element={<AdminReviews />} />`, add:

```tsx
        <Route path="/admin/promosi" element={<AdminPromotions />} />
        <Route path="/admin/promosi/tampilan" element={<AdminPromosiTampilan />} />
```

- [ ] **Step 5: Type-check + lint**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: No errors.

- [ ] **Step 6: Verify in browser**

Run `npm run dev`. Navigate to `http://localhost:5173/admin`.
- Sidebar shows "Promosi" group with "Kelola Promosi" and "Tampilan Promosi" children
- `/admin/promosi` loads without crash — table is empty
- `/admin/promosi/tampilan` loads without crash — empty state message shown
- Create a test promotion: fill all fields, upload a banner, pick products, save → row appears in table
- Open PromosiTampilan: card appears, toggle works, drag + save order works

- [ ] **Step 7: Commit**

```bash
git add client/src/components/AdminLayout.tsx client/src/App.tsx
git commit -m "feat: add Promotions and PromosiTampilan admin routes and sidebar"
```

---

### Task 9: PromosiSection Public Component + Home.tsx

**Files:**
- Create: `client/src/components/PromosiSection.tsx`
- Modify: `client/src/pages/Home.tsx`

- [ ] **Step 1: Create PromosiSection.tsx**

```tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import api from '../services/api';
import StarRating from './StarRating';

interface ActivePromotion {
  _id: string;
  name: string;
  description: string;
  bannerImage: string;
  startDate: string;
  endDate: string;
  discountPercent: number;
  type: 'products' | 'category';
  productIds: string[];
  categoryId: string | null;
}

interface Product {
  _id: string;
  name: string;
  image: string;
  priceNumeric: number;
  description: string;
  ratingAvg: number;
  reviewCount: number;
  category: { _id: string; name: string } | null;
  activePromotion: { _id: string; name: string; discountPercent: number } | null;
}

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

interface PromoTabProps {
  promo: ActivePromotion;
  products: Product[];
}

function PromoTab({ promo, products }: PromoTabProps) {
  const promoProducts = products.filter(p => p.activePromotion?._id === promo._id);

  return (
    <div>
      {/* Banner */}
      <div className="relative w-full h-48 sm:h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
        {promo.bannerImage ? (
          <img
            src={api.getImageUrl(promo.bannerImage)}
            alt={promo.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-[#2B3A67]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-6 left-6">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-bold rounded-full mb-2">
            -{promo.discountPercent}%
          </span>
          <h3 className="text-2xl md:text-3xl font-bold text-white">{promo.name}</h3>
          {promo.description && (
            <p className="text-white/80 text-sm mt-1 max-w-md line-clamp-2">{promo.description}</p>
          )}
        </div>
      </div>

      {/* Product Carousel */}
      {promoProducts.length > 0 && (
        <Swiper
          modules={[Navigation]}
          spaceBetween={20}
          navigation
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
            1280: { slidesPerView: 4 },
          }}
        >
          {promoProducts.map(product => {
            const discounted = Math.round(product.priceNumeric * (1 - promo.discountPercent / 100));
            return (
              <SwiperSlide key={product._id}>
                <Link to={`/produk/${product._id}`} className="group block">
                  <div className="rounded-2xl bg-gray-100 overflow-hidden aspect-square mb-4 relative">
                    <img
                      src={api.getImageUrl(product.image)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      onError={e => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400';
                      }}
                    />
                    <span className="absolute top-3 left-3 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      -{promo.discountPercent}%
                    </span>
                  </div>
                  <div className="px-1">
                    <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">{product.name}</h4>
                    {product.reviewCount > 0 && (
                      <div className="flex items-center gap-1 mb-1">
                        <StarRating value={product.ratingAvg ?? 0} size="sm" />
                        <span className="text-xs text-gray-400">({product.reviewCount})</span>
                      </div>
                    )}
                    {product.priceNumeric > 0 && (
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400 line-through">{formatRp(product.priceNumeric)}</span>
                        <span className="text-sm font-bold text-red-600">{formatRp(discounted)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              </SwiperSlide>
            );
          })}
        </Swiper>
      )}
    </div>
  );
}

export default function PromosiSection() {
  const [promos, setPromos] = useState<ActivePromotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getActivePromotions(), api.getProducts()])
      .then(([p, prods]) => {
        setPromos(p);
        setProducts(prods);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || promos.length === 0) return null;

  return (
    <section className="pt-10 bg-[#F9F7F2]">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight">Promosi Spesial</h2>
          {promos.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {promos.map((promo, idx) => (
                <button
                  key={promo._id}
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    activeTab === idx
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {promo.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <PromoTab promo={promos[activeTab]} products={products} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add PromosiSection to Home.tsx**

Add import after `import ProductsSection from '../components/ProductsSection';`:

```tsx
import PromosiSection from '../components/PromosiSection';
```

In the `<main>` body, insert the new section after `<ProductsSection />` and before `<ManufacturingSection />`:

```tsx
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <PromosiSection />
        </motion.div>
```

- [ ] **Step 3: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Verify in browser**

Create a promotion with `startDate <= today <= endDate` and `isVisible: true` via `/admin/promosi`. Refresh home page — `PromosiSection` should render above ManufacturingSection with banner and product carousel. If no active visible promos exist, section renders nothing (no layout shift).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/PromosiSection.tsx client/src/pages/Home.tsx
git commit -m "feat: add PromosiSection to home page with banner and product carousel"
```

---

### Task 10: Product Price Display Updates

**Files:**
- Modify: `client/src/pages/ProductDetail.tsx`
- Modify: `client/src/pages/Products.tsx`
- Modify: `client/src/components/ProductsSection.tsx`

- [ ] **Step 1: Add activePromotion to Product interface in ProductDetail.tsx**

In the `Product` interface (around line 38), add after `reviewCount: number;`:

```ts
  activePromotion: { _id: string; name: string; discountPercent: number } | null;
```

- [ ] **Step 2: Replace price display in ProductDetail.tsx**

Find this block (around line 277):

```tsx
              <p className="text-2xl font-bold text-gray-900">
                {hasPrice ? formatRp(effectivePrice) : 'Hubungi untuk harga'}
              </p>
```

Replace with:

```tsx
              {hasPrice ? (
                product.activePromotion ? (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-red-600">
                        {formatRp(Math.round(effectivePrice * (1 - product.activePromotion.discountPercent / 100)))}
                      </span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                        -{product.activePromotion.discountPercent}%
                      </span>
                    </div>
                    <span className="text-sm text-gray-400 line-through">{formatRp(effectivePrice)}</span>
                    <span className="text-xs text-primary mt-0.5">{product.activePromotion.name}</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{formatRp(effectivePrice)}</p>
                )
              ) : (
                <p className="text-2xl font-bold text-gray-900">Hubungi untuk harga</p>
              )}
```

- [ ] **Step 3: Add promo price to Products.tsx product grid**

In the product grid (around line 268), after `<p className="text-xs text-gray-500 line-clamp-2 mb-2">` and its closing `</p>`, insert before `<button className="cursor-pointer text-sm font-semibold text-indigo-600 ...">`:

```tsx
                        {product.priceNumeric > 0 && product.activePromotion && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-sm font-bold text-red-600">
                              {`Rp ${Math.round(product.priceNumeric * (1 - product.activePromotion.discountPercent / 100)).toLocaleString('id-ID')}`}
                            </span>
                            <span className="text-xs text-gray-400 line-through">
                              {`Rp ${product.priceNumeric.toLocaleString('id-ID')}`}
                            </span>
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-500 text-xs font-bold rounded-full">
                              -{product.activePromotion.discountPercent}%
                            </span>
                          </div>
                        )}
```

- [ ] **Step 4: Add promo price to ProductsSection.tsx**

In `client/src/components/ProductsSection.tsx`, in the product card content block, after the star rating `<div>` and before `<p className="text-lg text-black/80 ...">`, insert:

```tsx
                    {product.activePromotion && product.priceNumeric > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base font-bold text-red-600">
                          {`Rp ${Math.round(product.priceNumeric * (1 - product.activePromotion.discountPercent / 100)).toLocaleString('id-ID')}`}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          {`Rp ${product.priceNumeric.toLocaleString('id-ID')}`}
                        </span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-500 text-xs font-bold rounded-full">
                          -{product.activePromotion.discountPercent}%
                        </span>
                      </div>
                    )}
```

- [ ] **Step 5: Type-check + lint**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: No errors.

- [ ] **Step 6: Verify in browser**

With a promotion active and a product with `priceNumeric > 0` in it:
- `/produk` grid: discounted price (red) + strikethrough original + badge visible on that product card
- `/produk/:id`: price area shows discounted price in red + badge + strikethrough + promo name
- Home page `ProductsSection` carousel: discount badge + discounted price visible on that card

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/ProductDetail.tsx client/src/pages/Products.tsx client/src/components/ProductsSection.tsx
git commit -m "feat: show discounted prices and promo badges on product cards and detail page"
```
