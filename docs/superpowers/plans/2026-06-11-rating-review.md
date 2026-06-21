# Rating & Review System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full rating & review system — customers who received an order can rate + comment + upload photos per order item; reviews appear on product cards, product detail, and are manageable by admin.

**Architecture:** Separate `Review` MongoDB collection with a unique constraint per `{customer, order, product}`. Product schema caches `ratingAvg` and `reviewCount` updated by a shared `recalcProductStats` helper after every review mutation. Admin can hide or permanently delete reviews.

**Tech Stack:** Node.js/Express (CommonJS), Mongoose, Cloudinary (multer-storage-cloudinary), React + TypeScript (strict), Tailwind CSS, Lucide icons, Base UI Sheet for the review form modal.

---

## File Map

```
NEW (backend):
  models/Review.js
  services/recalcProductStats.js
  routes/reviewRoutes.js
  routes/adminReviewRoutes.js

MODIFY (backend):
  models/Product.js              — add ratingAvg, reviewCount fields
  server.js                      — register 2 new route files

NEW (frontend):
  client/src/components/StarRating.tsx
  client/src/components/ReviewCard.tsx
  client/src/components/ReviewForm.tsx
  client/src/pages/admin/Reviews.tsx

MODIFY (frontend):
  client/src/types/ecommerce.ts          — add Review, ReviewsResponse interfaces
  client/src/services/api.ts             — add 3 review API methods
  client/src/hooks/useApi.ts             — add useProductReviews hook
  client/src/pages/ProductDetail.tsx     — wire real stars + full reviews section
  client/src/pages/Products.tsx          — add stars to product cards
  client/src/components/ProductsSection.tsx — add stars to home carousel cards
  client/src/pages/PesananDetail.tsx     — add "Tulis Ulasan" per delivered item
  client/src/App.tsx                     — add /admin/reviews route
  client/src/components/AdminLayout.tsx  — add Reviews sidebar entry
```

---

## Task 1: Backend — Review Model + Product Stats Fields + Helper

**Files:**
- Create: `models/Review.js`
- Create: `services/recalcProductStats.js`
- Modify: `models/Product.js`

- [ ] **Step 1: Create `models/Review.js`**

```js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customer:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  order:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  rating:    { type: Number, min: 1, max: 5, required: true },
  comment:   { type: String, default: '', maxlength: 1000 },
  photos:    { type: [String], default: [] },
  isVisible: { type: Boolean, default: true },
}, { timestamps: true });

reviewSchema.index({ customer: 1, order: 1, product: 1 }, { unique: true });
reviewSchema.index({ product: 1, isVisible: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
```

- [ ] **Step 2: Create `services/recalcProductStats.js`**

```js
const Review  = require('../models/Review');
const Product = require('../models/Product');

async function recalcProductStats(productId) {
  const stats = await Review.aggregate([
    { $match: { product: productId, isVisible: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    ratingAvg:   parseFloat((stats[0]?.avg   || 0).toFixed(1)),
    reviewCount: stats[0]?.count || 0,
  });
}

module.exports = recalcProductStats;
```

- [ ] **Step 3: Add `ratingAvg` and `reviewCount` to `models/Product.js`**

Open `models/Product.js`. After the existing `isFeatured` field (around line 30), add:

```js
  ratingAvg:   { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
```

- [ ] **Step 4: Commit**

```bash
git add models/Review.js services/recalcProductStats.js models/Product.js
git commit -m "feat: add Review model, recalcProductStats helper, cache fields on Product"
```

---

## Task 2: Backend — Customer Review Routes

**Files:**
- Create: `routes/reviewRoutes.js`
- Modify: `server.js`

- [ ] **Step 1: Create `routes/reviewRoutes.js`**

```js
const express      = require('express');
const router       = express.Router();
const mongoose     = require('mongoose');
const Review       = require('../models/Review');
const Order        = require('../models/Order');
const customerAuth = require('../middleware/customerAuth');
const upload       = require('../middleware/upload');
const recalc       = require('../services/recalcProductStats');

// GET /api/reviews/can-review?productId=&orderId=
router.get('/can-review', customerAuth, async (req, res) => {
  try {
    const { productId, orderId } = req.query;
    if (!productId || !orderId) return res.status(400).json({ message: 'productId and orderId required' });

    const order = await Order.findOne({
      _id: orderId,
      customer: req.customer._id,
      orderStatus: 'delivered',
    });
    if (!order) return res.json({ canReview: false, alreadyReviewed: false });

    const hasItem = order.items.some(
      (item) => item.product && item.product.toString() === productId
    );
    if (!hasItem) return res.json({ canReview: false, alreadyReviewed: false });

    const existing = await Review.findOne({
      customer: req.customer._id,
      order: orderId,
      product: productId,
    });

    res.json({ canReview: !existing, alreadyReviewed: !!existing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reviews/product/:productId?page=1&limit=10
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId))
      return res.status(400).json({ message: 'Invalid productId' });

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const query = { product: productId, isVisible: true };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('customer', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
    ]);

    // Rating distribution: count per star 1-5
    const distAgg = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isVisible: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distAgg.forEach((d) => { ratingDistribution[d._id] = d.count; });

    const avgAgg = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isVisible: true } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);
    const ratingAvg = parseFloat((avgAgg[0]?.avg || 0).toFixed(1));

    res.json({ reviews, total, page, pages: Math.ceil(total / limit), ratingAvg, ratingDistribution });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/reviews
router.post('/', customerAuth, upload.array('photos', 5), async (req, res) => {
  try {
    const { productId, orderId, rating, comment } = req.body;

    if (!productId || !orderId || !rating)
      return res.status(400).json({ message: 'productId, orderId, dan rating wajib diisi' });

    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5)
      return res.status(400).json({ message: 'Rating harus antara 1 dan 5' });

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(orderId))
      return res.status(400).json({ message: 'ID tidak valid' });

    // Verify order delivered and contains product
    const order = await Order.findOne({
      _id: orderId,
      customer: req.customer._id,
      orderStatus: 'delivered',
    });
    if (!order) return res.status(403).json({ message: 'Pesanan tidak ditemukan atau belum selesai' });

    const hasItem = order.items.some(
      (item) => item.product && item.product.toString() === productId
    );
    if (!hasItem) return res.status(403).json({ message: 'Produk tidak ada di pesanan ini' });

    // Check no existing review
    const existing = await Review.findOne({
      customer: req.customer._id,
      order: orderId,
      product: productId,
    });
    if (existing) return res.status(409).json({ message: 'Kamu sudah mengulas produk ini untuk pesanan ini' });

    const photos = (req.files || []).map((f) => f.path);

    const review = await Review.create({
      product:  productId,
      customer: req.customer._id,
      order:    orderId,
      rating:   ratingNum,
      comment:  (comment || '').slice(0, 1000),
      photos,
    });

    await recalc(new mongoose.Types.ObjectId(productId));

    const populated = await review.populate('customer', 'name avatar');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Kamu sudah mengulas produk ini untuk pesanan ini' });
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 2: Register route in `server.js`**

In `server.js`, after the `app.use('/api/admin/customers', ...)` line (around line 98), add:

```js
app.use('/api/reviews', require('./routes/reviewRoutes'));
```

- [ ] **Step 3: Commit**

```bash
git add routes/reviewRoutes.js server.js
git commit -m "feat: add customer review routes (submit, list, can-review)"
```

---

## Task 3: Backend — Admin Review Routes

**Files:**
- Create: `routes/adminReviewRoutes.js`
- Modify: `server.js`

- [ ] **Step 1: Create `routes/adminReviewRoutes.js`**

```js
const express   = require('express');
const router    = express.Router();
const mongoose  = require('mongoose');
const Review    = require('../models/Review');
const auth      = require('../middleware/auth');
const recalc    = require('../services/recalcProductStats');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/admin/reviews?search=&rating=&isVisible=&page=1&limit=20
router.get('/', auth, async (req, res) => {
  try {
    const { search = '', rating, isVisible, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build aggregate pipeline for search across populated customer/product names
    const matchStage = {};
    if (rating) matchStage.rating = Number(rating);
    if (isVisible === 'true')  matchStage.isVisible = true;
    if (isVisible === 'false') matchStage.isVisible = false;

    let pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerDoc',
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: { path: '$customerDoc', preserveNullAndEmpty: true } },
      { $unwind: { path: '$productDoc', preserveNullAndEmpty: true } },
    ];

    if (search) {
      const rx = escapeRegex(search);
      pipeline.push({
        $match: {
          $or: [
            { 'customerDoc.name': { $regex: rx, $options: 'i' } },
            { 'productDoc.name':  { $regex: rx, $options: 'i' } },
          ],
        },
      });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    const dataPipeline  = [
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $project: {
          rating: 1, comment: 1, photos: 1, isVisible: 1, createdAt: 1,
          'customerDoc.name': 1, 'customerDoc.avatar': 1,
          'productDoc.name': 1, 'productDoc._id': 1,
        },
      },
    ];

    const [countResult, reviews] = await Promise.all([
      Review.aggregate(countPipeline),
      Review.aggregate(dataPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    res.json({ reviews, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/reviews/:id/visibility
router.patch('/:id/visibility', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review tidak ditemukan' });
    review.isVisible = !review.isVisible;
    await review.save();
    await recalc(review.product);
    res.json({ isVisible: review.isVisible });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review tidak ditemukan' });
    await recalc(review.product);
    res.json({ message: 'Review dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 2: Register admin route in `server.js`**

After the `app.use('/api/reviews', ...)` line added in Task 2, add:

```js
app.use('/api/admin/reviews', require('./routes/adminReviewRoutes'));
```

- [ ] **Step 3: Commit**

```bash
git add routes/adminReviewRoutes.js server.js
git commit -m "feat: add admin review routes (list, toggle visibility, delete)"
```

---

## Task 4: Frontend — Types, API Methods, Hook

**Files:**
- Modify: `client/src/types/ecommerce.ts`
- Modify: `client/src/services/api.ts`
- Modify: `client/src/hooks/useApi.ts`

- [ ] **Step 1: Add types to `client/src/types/ecommerce.ts`**

Append at the end of the file:

```ts
export interface Review {
  _id: string;
  product: string;
  customer: { _id: string; name: string; avatar?: string };
  order: string;
  rating: number;
  comment: string;
  photos: string[];
  isVisible: boolean;
  createdAt: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  pages: number;
  ratingAvg: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface CanReviewResponse {
  canReview: boolean;
  alreadyReviewed: boolean;
}
```

- [ ] **Step 2: Add 3 API methods to `client/src/services/api.ts`**

Append before the closing `};` of the default export object:

```ts
  getProductReviews: async (productId: string, page = 1): Promise<ReviewsResponse> => {
    const res = await fetch(`${API_BASE_URL}/reviews/product/${productId}?page=${page}&limit=10`);
    if (!res.ok) throw new Error('Gagal memuat ulasan');
    return res.json();
  },

  canReview: async (productId: string, orderId: string): Promise<CanReviewResponse> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(
      `${API_BASE_URL}/reviews/can-review?productId=${productId}&orderId=${orderId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return { canReview: false, alreadyReviewed: false };
    return res.json();
  },

  submitReview: async (data: FormData): Promise<Review> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || 'Gagal menyimpan ulasan');
    }
    return res.json();
  },
```

Also add the missing imports at the top of `api.ts` — add `Review`, `ReviewsResponse`, `CanReviewResponse` to the import from types if the file has a type import block. If no import exists for these types yet, add:

```ts
import type { Review, ReviewsResponse, CanReviewResponse } from '../types/ecommerce';
```

- [ ] **Step 3: Add `useProductReviews` hook to `client/src/hooks/useApi.ts`**

Append at the end of `useApi.ts`:

```ts
export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<import('../types/ecommerce').Review[]>([]);
  const [meta, setMeta] = useState<{
    total: number; pages: number; page: number;
    ratingAvg: number;
    ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api.getProductReviews(productId, 1)
      .then((data) => {
        setReviews(data.reviews);
        setMeta({ total: data.total, pages: data.pages, page: data.page, ratingAvg: data.ratingAvg, ratingDistribution: data.ratingDistribution });
        setPage(1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  const loadMore = useCallback(async () => {
    if (!meta || page >= meta.pages) return;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const data = await api.getProductReviews(productId, next);
      setReviews((prev) => [...prev, ...data.reviews]);
      setPage(next);
      setMeta((prev) => prev ? { ...prev, page: next } : prev);
    } finally {
      setLoadingMore(false);
    }
  }, [productId, page, meta]);

  return { reviews, meta, loading, loadingMore, loadMore };
}
```

Make sure `useCallback` is imported at the top of `useApi.ts`. It already is based on the existing code.

- [ ] **Step 4: Typecheck**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/types/ecommerce.ts client/src/services/api.ts client/src/hooks/useApi.ts
git commit -m "feat: add Review types, api methods, and useProductReviews hook"
```

---

## Task 5: StarRating Component

**Files:**
- Create: `client/src/components/StarRating.tsx`

- [ ] **Step 1: Create `client/src/components/StarRating.tsx`**

```tsx
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  value: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'size-3.5', md: 'size-5', lg: 'size-7' };

export default function StarRating({ value, interactive = false, onChange, size = 'md' }: Props) {
  const cls = sizeMap[size];

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = value >= s;
        const half   = !filled && value >= s - 0.5;
        return (
          <button
            key={s}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(s)}
            className={cn(
              'p-0 bg-transparent border-0 focus:outline-none',
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
            )}
            aria-label={`${s} bintang`}
          >
            <Star
              className={cn(
                cls,
                filled || half
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/StarRating.tsx
git commit -m "feat: add StarRating component (display + interactive modes)"
```

---

## Task 6: ReviewCard Component

**Files:**
- Create: `client/src/components/ReviewCard.tsx`

- [ ] **Step 1: Create `client/src/components/ReviewCard.tsx`**

```tsx
import { useState } from 'react';
import type { Review } from '../types/ecommerce';
import StarRating from './StarRating';
import api from '../services/api';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface Props {
  review: Review;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ReviewCard({ review }: Props) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  return (
    <>
      <div className="py-5 border-b border-gray-100 last:border-0">
        <div className="flex items-start gap-3">
          <Avatar className="size-9 shrink-0 [&::after]:hidden">
            {review.customer.avatar && (
              <AvatarImage src={api.getImageUrl(review.customer.avatar)} alt={review.customer.name} />
            )}
            <AvatarFallback className="bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-xs font-semibold">
              {initials(review.customer.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{review.customer.name}</p>
              <p className="text-xs text-gray-400 shrink-0">{formatDate(review.createdAt)}</p>
            </div>
            <StarRating value={review.rating} size="sm" />
            {review.comment && (
              <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {review.comment}
              </p>
            )}
            {review.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {review.photos.map((photo, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxSrc(api.getImageUrl(photo))}
                    className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition cursor-zoom-in"
                  >
                    <img
                      src={api.getImageUrl(photo)}
                      alt={`Foto ulasan ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Foto ulasan"
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
          />
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ReviewCard.tsx
git commit -m "feat: add ReviewCard component with photo lightbox"
```

---

## Task 7: ReviewForm Component (Sheet Modal)

**Files:**
- Create: `client/src/components/ReviewForm.tsx`

- [ ] **Step 1: Create `client/src/components/ReviewForm.tsx`**

```tsx
import { useState, useRef } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import api from '../services/api';
import StarRating from './StarRating';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId: string;
  orderId: string;
  productName: string;
}

export default function ReviewForm({ open, onClose, onSuccess, productId, orderId, productName }: Props) {
  const [rating, setRating]         = useState(0);
  const [comment, setComment]       = useState('');
  const [photos, setPhotos]         = useState<File[]>([]);
  const [previews, setPreviews]     = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRating(0);
    setComment('');
    setPhotos([]);
    setPreviews([]);
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      setError('Maksimal 5 foto');
      return;
    }
    const newFiles    = [...photos, ...files].slice(0, 5);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPhotos(newFiles);
    setPreviews(newPreviews);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError('Pilih rating bintang terlebih dahulu'); return; }
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('orderId',   orderId);
      formData.append('rating',    String(rating));
      formData.append('comment',   comment.trim());
      photos.forEach((f) => formData.append('photos', f));
      await api.submitReview(formData);
      reset();
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan ulasan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto px-6 py-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-semibold text-gray-900">
            Tulis Ulasan
          </SheetTitle>
          <p className="text-sm text-gray-500 truncate">{productName}</p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star rating */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Rating</p>
            <StarRating value={rating} interactive onChange={setRating} size="lg" />
          </div>

          {/* Comment */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Komentar <span className="text-gray-400 font-normal">(opsional)</span>
            </p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              placeholder="Ceritakan pengalamanmu dengan produk ini..."
              className="resize-none h-28 border-gray-200 focus-visible:border-primary"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/1000</p>
          </div>

          {/* Photo upload */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Foto <span className="text-gray-400 font-normal">(opsional, maks 5)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative w-16 h-16">
                  <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition text-xs gap-1"
                >
                  <Camera className="size-4" />
                  <span>Tambah</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={handleClose}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting || rating === 0}
              className="flex-1 rounded-full bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white border-0"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Kirim Ulasan'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ReviewForm.tsx
git commit -m "feat: add ReviewForm sheet modal (stars + comment + photos)"
```

---

## Task 8: ProductDetail Page — Wire Stars + Reviews Section

**Files:**
- Modify: `client/src/pages/ProductDetail.tsx`

- [ ] **Step 1: Add `ratingAvg` and `reviewCount` to local `Product` interface**

In `ProductDetail.tsx`, find the `interface Product { ... }` block and add two fields:

```ts
interface Product {
  _id: string;
  name: string;
  description: string;
  image: string;
  images: string[];
  category: { _id: string; name: string } | null;
  price: string;
  isFeatured: boolean;
  priceNumeric: number;
  weightGrams: number;
  variants: Variant[];
  ratingAvg: number;
  reviewCount: number;
}
```

- [ ] **Step 2: Add imports to `ProductDetail.tsx`**

Add these imports after the existing imports block:

```ts
import StarRating from '../components/StarRating';
import ReviewCard from '../components/ReviewCard';
import { useProductReviews } from '../hooks/useApi';
```

- [ ] **Step 3: Add reviews hook inside `ProductDetail` component**

Inside the `ProductDetail` component function, after the existing `useState` declarations, add:

```ts
const { reviews, meta, loading: reviewsLoading, loadingMore, loadMore } = useProductReviews(product?._id ?? '');
```

This can go just before the `return` statement (or after `useWishlist`).

- [ ] **Step 4: Replace hardcoded stars in header area**

Find this block (around line 241):
```tsx
<div className="flex items-center gap-2">
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className="size-4 fill-gray-200 text-gray-200" />
    ))}
  </div>
  <span className="text-sm text-gray-400">0 ulasan</span>
</div>
```

Replace with:
```tsx
<div className="flex items-center gap-2">
  <StarRating value={product.ratingAvg} size="sm" />
  <span className="text-sm text-gray-400">
    {product.reviewCount > 0 ? `${product.reviewCount} ulasan` : 'Belum ada ulasan'}
  </span>
</div>
```

- [ ] **Step 5: Replace the reviews section placeholder**

Find the `{/* Rating & Reviews */}` section (around line 351):
```tsx
{/* Rating & Reviews */}
<section className="py-16 mt-12 bg-[#F9F7F2]">
  <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
      Ulasan Pembeli
    </h2>
    <p className="text-sm text-gray-400 mb-10">0 ulasan</p>
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className="size-8 fill-gray-200 text-gray-200" />
        ))}
      </div>
      <p className="text-gray-400 text-sm">Belum ada ulasan untuk produk ini.</p>
    </div>
  </div>
</section>
```

Replace with:
```tsx
{/* Rating & Reviews */}
<section className="py-16 mt-12 bg-[#F9F7F2]">
  <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
      Ulasan Pembeli
    </h2>
    <p className="text-sm text-gray-400 mb-8">{product.reviewCount} ulasan</p>

    {reviewsLoading ? (
      <div className="flex justify-center py-12">
        <div className="animate-pulse h-6 w-40 bg-gray-200 rounded" />
      </div>
    ) : meta && meta.total > 0 ? (
      <>
        {/* Summary */}
        <div className="flex flex-col sm:flex-row gap-8 mb-10 p-6 bg-white rounded-2xl">
          <div className="flex flex-col items-center justify-center shrink-0">
            <p className="text-5xl font-bold text-gray-900">{meta.ratingAvg.toFixed(1)}</p>
            <StarRating value={meta.ratingAvg} size="md" />
            <p className="text-sm text-gray-400 mt-1">{meta.total} ulasan</p>
          </div>
          <div className="flex-1 space-y-2">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = meta.ratingDistribution[star] ?? 0;
              const pct   = meta.total > 0 ? Math.round((count / meta.total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-6 text-right">{star}★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-6">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review list */}
        <div className="bg-white rounded-2xl px-6">
          {reviews.map((review) => (
            <ReviewCard key={review._id} review={review} />
          ))}
        </div>

        {/* Load more */}
        {meta.page < meta.pages && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-8 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
            </button>
          </div>
        )}
      </>
    ) : (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <StarRating value={0} size="lg" />
        <p className="text-gray-400 text-sm">Belum ada ulasan untuk produk ini.</p>
      </div>
    )}
  </div>
</section>
```

- [ ] **Step 6: Typecheck**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors. If `Star` from lucide-react is no longer used, remove it from the import.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/ProductDetail.tsx
git commit -m "feat: wire real ratings and full reviews section in ProductDetail"
```

---

## Task 9: Product Cards — Add Stars

**Files:**
- Modify: `client/src/pages/Products.tsx`
- Modify: `client/src/components/ProductsSection.tsx`

- [ ] **Step 1: Add stars to `Products.tsx` product cards**

In `Products.tsx`, add this import:
```ts
import StarRating from '../components/StarRating';
```

Find the product card `<div>` block (around line 260, inside `pagedProducts.map`):
```tsx
<div>
  <h3 className="text-sm font-bold text-gray-900 mb-1">
    {product.name}
  </h3>
  <p className="text-xs text-gray-500 line-clamp-2 mb-2">
    {product.description}
  </p>
  <button className="cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-700">
    Lihat Detail
  </button>
</div>
```

Replace with:
```tsx
<div>
  <h3 className="text-sm font-bold text-gray-900 mb-1">
    {product.name}
  </h3>
  <div className="flex items-center gap-1.5 mb-1">
    <StarRating value={product.ratingAvg ?? 0} size="sm" />
    {product.reviewCount > 0 && (
      <span className="text-xs text-gray-400">({product.reviewCount})</span>
    )}
  </div>
  <p className="text-xs text-gray-500 line-clamp-2 mb-2">
    {product.description}
  </p>
  <button className="cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-700">
    Lihat Detail
  </button>
</div>
```

- [ ] **Step 2: Add stars to `ProductsSection.tsx` home carousel cards**

In `ProductsSection.tsx`, add import:
```ts
import StarRating from './StarRating';
```

Find the card content block where `product.name` and `product.description` are rendered. After the `<h3>{product.name}</h3>` tag, add:
```tsx
{product.reviewCount > 0 && (
  <div className="flex items-center gap-1.5 mb-2">
    <StarRating value={product.ratingAvg ?? 0} size="sm" />
    <span className="text-xs text-black/50">({product.reviewCount})</span>
  </div>
)}
```

- [ ] **Step 3: Typecheck**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Products.tsx client/src/components/ProductsSection.tsx
git commit -m "feat: show star rating on product cards in Products page and home carousel"
```

---

## Task 10: PesananDetail — Review Buttons + Form

**Files:**
- Modify: `client/src/pages/PesananDetail.tsx`

- [ ] **Step 1: Add imports to `PesananDetail.tsx`**

Add to the existing imports:
```ts
import { useEffect, useState } from 'react';  // add useEffect if not present; useState is already there
import ReviewForm from '../components/ReviewForm';
import api from '../services/api';  // already imported
import type { CanReviewResponse } from '../types/ecommerce';
```

Note: `useEffect` and `useState` should already be imported — just ensure they are.

- [ ] **Step 2: Add review state inside `PesananDetail` component**

After the existing state declarations, add:
```ts
const [reviewStatuses, setReviewStatuses] = useState<Record<string, CanReviewResponse>>({});
const [reviewFormItem, setReviewFormItem] = useState<{
  productId: string; orderId: string; productName: string;
} | null>(null);
```

- [ ] **Step 3: Add `useEffect` to fetch review statuses when order is delivered**

After the existing `useEffect` that loads the order, add:
```ts
useEffect(() => {
  if (!order || order.orderStatus !== 'delivered') return;
  const token = localStorage.getItem('customerToken');
  if (!token) return;
  const fetchStatuses = async () => {
    const results: Record<string, CanReviewResponse> = {};
    await Promise.all(
      order.items.map(async (item) => {
        if (!item.product) return;
        const key = `${order._id}-${item.product}`;
        results[key] = await api.canReview(item.product, order._id);
      })
    );
    setReviewStatuses(results);
  };
  fetchStatuses();
}, [order]);
```

- [ ] **Step 4: Update items rendering to show review button/badge**

Find the items rendering block:
```tsx
{order.items.map((item, i) => (
  <div key={i} className="flex items-center gap-3">
    <img src={api.getImageUrl(item.image)} alt={item.name} className="w-14 h-14 object-cover rounded-xl shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="font-medium text-black truncate">{item.name}</p>
      <p className="text-sm text-black/60">{fmt(item.priceNumeric)} × {item.quantity}</p>
    </div>
    <p className="font-bold text-black shrink-0">{fmt(item.subtotal)}</p>
  </div>
))}
```

Replace with:
```tsx
{order.items.map((item, i) => {
  const key    = item.product ? `${order._id}-${item.product}` : null;
  const status = key ? reviewStatuses[key] : null;
  return (
    <div key={i} className="flex items-center gap-3">
      <img src={api.getImageUrl(item.image)} alt={item.name} className="w-14 h-14 object-cover rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-black truncate">{item.name}</p>
        <p className="text-sm text-black/60">{fmt(item.priceNumeric)} × {item.quantity}</p>
        {order.orderStatus === 'delivered' && status?.canReview && (
          <button
            type="button"
            onClick={() => setReviewFormItem({ productId: item.product!, orderId: order._id, productName: item.name })}
            className="mt-1 text-xs font-medium text-primary hover:underline"
          >
            Tulis Ulasan
          </button>
        )}
        {order.orderStatus === 'delivered' && status?.alreadyReviewed && (
          <span className="mt-1 inline-block text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            Sudah Diulas
          </span>
        )}
      </div>
      <p className="font-bold text-black shrink-0">{fmt(item.subtotal)}</p>
    </div>
  );
})}
```

- [ ] **Step 5: Add ReviewForm at the bottom of the return JSX**

Before the closing `</UserLayout>`, add:
```tsx
{reviewFormItem && (
  <ReviewForm
    open={!!reviewFormItem}
    onClose={() => setReviewFormItem(null)}
    onSuccess={() => {
      if (!order || !reviewFormItem) return;
      const key = `${reviewFormItem.orderId}-${reviewFormItem.productId}`;
      setReviewStatuses((prev) => ({
        ...prev,
        [key]: { canReview: false, alreadyReviewed: true },
      }));
      setReviewFormItem(null);
    }}
    productId={reviewFormItem.productId}
    orderId={reviewFormItem.orderId}
    productName={reviewFormItem.productName}
  />
)}
```

- [ ] **Step 6: Typecheck**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors. If `item.product` causes a type error (it's `string` per the `OrderItem` interface), ensure the non-null assertion `item.product!` is valid — it is, because we check `item.product ?` before using it.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/PesananDetail.tsx
git commit -m "feat: add review button and form to delivered order items in PesananDetail"
```

---

## Task 11: Admin Reviews Page + Route + Sidebar

**Files:**
- Create: `client/src/pages/admin/Reviews.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AdminLayout.tsx`

- [ ] **Step 1: Create `client/src/pages/admin/Reviews.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { API_BASE_URL } from '../../services/api';
import StarRating from '../../components/StarRating';

interface AdminReview {
  _id: string;
  rating: number;
  comment: string;
  photos: string[];
  isVisible: boolean;
  createdAt: string;
  customerDoc: { name: string; avatar?: string };
  productDoc:  { _id: string; name: string };
}

interface AdminReviewsResponse {
  reviews: AdminReview[];
  total: number;
  page: number;
  pages: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminReviews() {
  const token = localStorage.getItem('adminToken');
  const [reviews, setReviews]         = useState<AdminReview[]>([]);
  const [pagination, setPagination]   = useState<{ total: number; pages: number; page: number } | null>(null);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [filterVisible, setFilterVisible] = useState('');
  const [page, setPage]               = useState(1);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const fetchReviews = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (search)        params.set('search',    search);
      if (filterRating)  params.set('rating',    filterRating);
      if (filterVisible) params.set('isVisible', filterVisible);
      const res = await fetch(`${API_BASE_URL}/admin/reviews?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: AdminReviewsResponse = await res.json();
      setReviews(data.reviews || []);
      setPagination({ total: data.total, pages: data.pages, page: data.page });
    } finally {
      setLoading(false);
    }
  }, [token, search, filterRating, filterVisible]);

  useEffect(() => { fetchReviews(1); setPage(1); }, [fetchReviews]);

  const toggleVisibility = async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/admin/reviews/${id}/visibility`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setReviews((prev) =>
      prev.map((r) => (r._id === id ? { ...r, isVisible: data.isVisible } : r))
    );
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Hapus ulasan ini secara permanen?')) return;
    await fetch(`${API_BASE_URL}/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setReviews((prev) => prev.filter((r) => r._id !== id));
    setPagination((prev) => prev ? { ...prev, total: prev.total - 1 } : prev);
  };

  return (
    <AdminLayout title="Ulasan Produk">
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Cari produk atau customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-[180px]"
          />
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Rating</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} Bintang</option>
            ))}
          </select>
          <select
            value={filterVisible}
            onChange={(e) => setFilterVisible(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Status</option>
            <option value="true">Visible</option>
            <option value="false">Hidden</option>
          </select>
        </div>

        {/* Stats */}
        {pagination && (
          <p className="text-sm text-gray-500">{pagination.total} ulasan</p>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Produk</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Komentar</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Foto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">Memuat...</td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">Tidak ada ulasan</td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <>
                      <tr
                        key={review._id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === review._id ? null : review._id)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate">
                          {review.productDoc?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-[120px] truncate">
                          {review.customerDoc?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StarRating value={review.rating} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                          {review.comment
                            ? review.comment.slice(0, 80) + (review.comment.length > 80 ? '…' : '')
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {review.photos.length > 0 ? `${review.photos.length} foto` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            review.isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {review.isVisible ? 'Visible' : 'Hidden'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(review.createdAt)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleVisibility(review._id)}
                              className={`text-xs px-2 py-1 rounded-lg border transition ${
                                review.isVisible
                                  ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                  : 'border-green-200 text-green-700 hover:bg-green-50'
                              }`}
                            >
                              {review.isVisible ? 'Hide' : 'Show'}
                            </button>
                            <button
                              onClick={() => deleteReview(review._id)}
                              className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {expandedId === review._id && (
                        <tr key={`${review._id}-expanded`} className="bg-gray-50">
                          <td colSpan={8} className="px-6 py-4">
                            {review.comment && (
                              <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">{review.comment}</p>
                            )}
                            {review.photos.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {review.photos.map((photo, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setLightboxSrc(photo)}
                                    className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition cursor-zoom-in"
                                  >
                                    <img src={photo} alt="" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            )}
                            {!review.comment && review.photos.length === 0 && (
                              <p className="text-sm text-gray-400">Tidak ada komentar atau foto.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); fetchReviews(p); }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50 transition"
            >
              ← Sebelumnya
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              {page} / {pagination.pages}
            </span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => { const p = page + 1; setPage(p); fetchReviews(p); }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Berikutnya →
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="Foto ulasan" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
        </div>
      )}
    </AdminLayout>
  );
}
```

- [ ] **Step 2: Add route to `client/src/App.tsx`**

Add import:
```ts
import AdminReviews from './pages/admin/Reviews';
```

Add route (inside `<Routes>`, near the other admin routes):
```tsx
<Route path="/admin/reviews" element={<AdminReviews />} />
```

- [ ] **Step 3: Add sidebar entry to `client/src/components/AdminLayout.tsx`**

Add `MessageSquare` to the lucide-react import line:
```ts
import {
  // ... existing icons ...
  MessageSquare,
} from 'lucide-react'
```

In the `menuGroups` array, find the `'Transaksi'` group:
```ts
{
  label: 'Transaksi',
  items: [{ path: '/admin/orders', icon: ShoppingCart, label: 'Pesanan' }, { path: '/admin/users', icon: UsersIcon, label: 'Users' }],
},
```

Add the Reviews entry:
```ts
{
  label: 'Transaksi',
  items: [
    { path: '/admin/orders',   icon: ShoppingCart,   label: 'Pesanan' },
    { path: '/admin/users',    icon: UsersIcon,       label: 'Users'   },
    { path: '/admin/reviews',  icon: MessageSquare,   label: 'Ulasan'  },
  ],
},
```

- [ ] **Step 4: Typecheck + lint**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/admin/Reviews.tsx client/src/App.tsx client/src/components/AdminLayout.tsx
git commit -m "feat: add admin Reviews page with filter, visibility toggle, and delete"
```

---

## Final Verification

- [ ] Run dev server: `npm run dev`
- [ ] Navigate to a product detail page — confirm star row shows "Belum ada ulasan"
- [ ] Navigate to a delivered order — confirm "Tulis Ulasan" buttons appear per item
- [ ] Submit a review (stars + comment + photo) — confirm it disappears and badge "Sudah Diulas" appears
- [ ] Navigate back to the product detail — confirm review appears in the list with photo and stars
- [ ] Navigate to `/admin/reviews` — confirm the review appears in the table
- [ ] Toggle visibility to Hidden — confirm it disappears from the public product page
- [ ] Toggle back to Visible — confirm it reappears
- [ ] Delete the review — confirm it's gone
- [ ] Check product cards on `/produk` — if product has reviews, stars are visible
