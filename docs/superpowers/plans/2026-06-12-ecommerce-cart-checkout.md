# E-Commerce Cart & Checkout Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance Keranjang (Cart) and Checkout pages with checkbox partial-checkout, discount display, related-products carousel, multiple saved addresses, and a voucher/coupon system backed by Midtrans + Biteship.

**Architecture:** Bottom-up — types → backend models/routes → api.ts + hooks → reusable components → pages. Each task is independently verifiable. No external state manager; cart selection lives in component state (Set<string>); address/voucher live in custom hooks backed by the new API routes.

**Tech Stack:** Express/Mongoose (backend), React + TypeScript + Tailwind v4 (frontend), Midtrans Snap, Biteship, Swiper (existing)

---

## Task 1: Update `types/ecommerce.ts`

**Files:**
- Modify: `client/src/types/ecommerce.ts`

- [ ] **Step 1: Update CartItem, add SavedAddress + VoucherValidation, update CreateOrderPayload**

Replace the entire file content:

```ts
export interface ShippingAddress {
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  areaId: string;
  areaName: string;
}

export interface SavedAddress {
  _id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  areaId: string;
  areaName: string;
  isDefault: boolean;
}

export interface VoucherValidation {
  valid: boolean;
  voucherId?: string;
  discountAmount?: number;
  message: string;
}

export interface CustomerProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  googleId?: string;
  defaultAddress?: ShippingAddress;
}

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  priceNumeric: number;
  weightGrams: number;
  quantity: number;
  originalPrice?: number;
  discountPercent?: number;
  categoryId?: string;
}

export interface BiteshipArea {
  area_id: string;
  name: string;
  country_name: string;
  country_code: string;
  administrative_division_level_1_name: string;
  administrative_division_level_2_name: string;
  administrative_division_level_3_name: string;
  postal_code: string;
}

export interface ShippingRate {
  courier_name: string;
  courier_code: string;
  courier_service_name: string;
  courier_service_code: string;
  type: string;
  description: string;
  duration: string;
  price: number;
}

export interface OrderItem {
  product: string;
  name: string;
  image: string;
  priceNumeric: number;
  weightGrams: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  _id: string;
  customer: string;
  customerSnapshot: { name: string; email: string; phone: string };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  voucherCode: string;
  voucherDiscount: number;
  total: number;
  shippingAddress: ShippingAddress;
  shippingCourier: string;
  shippingService: string;
  shippingServiceName: string;
  estimatedDays: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
  orderStatus: 'awaiting_payment' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  midtransOrderId: string;
  midtransToken: string;
  midtransPaymentType?: string;
  biteshipOrderId?: string;
  biteshipTrackingCode?: string;
  biteshipWaybillId?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: ShippingAddress;
  shippingCourier: string;
  shippingService: string;
  shippingServiceName: string;
  shippingCost: number;
  estimatedDays: string;
  voucherCode?: string;
  voucherDiscount?: number;
}

export interface AdminOrdersParams {
  page?: number;
  limit?: number;
  orderStatus?: string;
  paymentStatus?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface Pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface WishlistProduct {
  _id: string;
  name: string;
  image: string;
  images: string[];
  priceNumeric: number;
}

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

- [ ] **Step 2: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/types/ecommerce.ts
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: extend CartItem, add SavedAddress and VoucherValidation types"
```

---

## Task 2: Update `utils/cart.ts`

**Files:**
- Modify: `client/src/utils/cart.ts`

- [ ] **Step 1: Add optional fields to addToCart and add getSelectedTotal**

Replace entire file:

```ts
import type { CartItem } from '../types/ecommerce';

const CART_KEY = 'kk_cart';

export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(
  item: Omit<CartItem, 'quantity'> & { quantity?: number }
): void {
  const cart = getCart();
  const existing = cart.find((c) => c.productId === item.productId);
  if (existing) {
    existing.quantity += item.quantity ?? 1;
  } else {
    cart.push({ ...item, quantity: item.quantity ?? 1 });
  }
  saveCart(cart);
  window.dispatchEvent(new Event('cartUpdated'));
}

export function removeFromCart(productId: string): void {
  saveCart(getCart().filter((c) => c.productId !== productId));
  window.dispatchEvent(new Event('cartUpdated'));
}

export function updateQty(productId: string, quantity: number): void {
  if (quantity < 1) { removeFromCart(productId); return; }
  const cart = getCart();
  const item = cart.find((c) => c.productId === productId);
  if (item) { item.quantity = quantity; saveCart(cart); }
  window.dispatchEvent(new Event('cartUpdated'));
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event('cartUpdated'));
}

export function getCartCount(): number {
  return getCart().reduce((sum, c) => sum + c.quantity, 0);
}

export function getCartTotal(): number {
  return getCart().reduce((sum, c) => sum + c.priceNumeric * c.quantity, 0);
}

export function getSelectedTotal(selectedIds: Set<string>): number {
  return getCart()
    .filter((c) => selectedIds.has(c.productId))
    .reduce((sum, c) => sum + c.priceNumeric * c.quantity, 0);
}
```

- [ ] **Step 2: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/utils/cart.ts
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add getSelectedTotal and optional discount fields to cart utils"
```

---

## Task 3: Create `models/Voucher.js`

**Files:**
- Create: `models/Voucher.js`

- [ ] **Step 1: Create Voucher model**

```js
const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code:           { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  discountType:   { type: String, enum: ['percent', 'fixed'], required: true },
  discountValue:  { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount:    { type: Number, default: 0 },
  usageLimit:     { type: Number, default: 0 },
  usedCount:      { type: Number, default: 0 },
  perUserLimit:   { type: Number, default: 0 },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date, required: true },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Voucher', voucherSchema);
```

- [ ] **Step 2: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add models/Voucher.js
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add Voucher model"
```

---

## Task 4: Update `models/Customer.js`

**Files:**
- Modify: `models/Customer.js`

- [ ] **Step 1: Add addresses array to schema**

After the `wishlist` field and before `}, { timestamps: true }`, insert the `addresses` array. The full updated schema section (replace from `const customerSchema` through `module.exports`):

```js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const savedAddressSchema = new mongoose.Schema({
  label:         { type: String, default: '' },
  recipientName: { type: String, default: '' },
  phone:         { type: String, default: '' },
  street:        { type: String, default: '' },
  city:          { type: String, default: '' },
  province:      { type: String, default: '' },
  postalCode:    { type: String, default: '' },
  areaId:        { type: String, default: '' },
  areaName:      { type: String, default: '' },
  isDefault:     { type: Boolean, default: false },
});

const customerSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: '' },
  phone:    { type: String, default: '', trim: true },
  avatar:   { type: String, default: '' },
  googleId: { type: String, default: '', index: true },
  suspended:{ type: Boolean, default: false },
  defaultAddress: {
    recipientName: { type: String, default: '' },
    phone:         { type: String, default: '' },
    street:        { type: String, default: '' },
    city:          { type: String, default: '' },
    province:      { type: String, default: '' },
    postalCode:    { type: String, default: '' },
    areaId:        { type: String, default: '' },
    areaName:      { type: String, default: '' },
  },
  addresses: [savedAddressSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });

customerSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

customerSchema.methods.matchPassword = async function (entered) {
  if (!this.password) return false;
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('Customer', customerSchema);
```

- [ ] **Step 2: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add models/Customer.js
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add addresses array to Customer model"
```

---

## Task 5: Update `models/Order.js`

**Files:**
- Modify: `models/Order.js`

- [ ] **Step 1: Add voucherCode and voucherDiscount fields**

After the `estimatedDays` field, insert:
```js
  voucherCode:     { type: String, default: '' },
  voucherDiscount: { type: Number, default: 0 },
```

The `total` field already exists — no change needed there, the route will compute total = subtotal − voucherDiscount + shippingCost.

- [ ] **Step 2: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add models/Order.js
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add voucherCode and voucherDiscount to Order model"
```

---

## Task 6: Create `routes/customerAddresses.js`

**Files:**
- Create: `routes/customerAddresses.js`

- [ ] **Step 1: Create CRUD routes for customer addresses**

```js
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
```

- [ ] **Step 2: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add routes/customerAddresses.js
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add customer addresses CRUD routes"
```

---

## Task 7: Create `routes/vouchers.js`

**Files:**
- Create: `routes/vouchers.js`

- [ ] **Step 1: Create voucher validate endpoint**

```js
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
      });
      if (userUsage >= voucher.perUserLimit) {
        return res.json({ valid: false, message: 'Kamu sudah menggunakan voucher ini' });
      }
    }

    let discountAmount = voucher.discountType === 'percent'
      ? Math.round(Number(subtotal) * voucher.discountValue / 100)
      : voucher.discountValue;

    if (voucher.discountType === 'percent' && voucher.maxDiscount > 0) {
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
```

- [ ] **Step 2: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add routes/vouchers.js
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add voucher validate route"
```

---

## Task 8: Update `routes/orderRoutes.js`

**Files:**
- Modify: `routes/orderRoutes.js`

- [ ] **Step 1: Add Voucher import at top of file**

After the existing `require` lines near the top, add:
```js
const Voucher = require('../models/Voucher');
```

- [ ] **Step 2: Update POST / handler to accept and re-validate voucher**

Find the `router.post('/', customerAuth, async (req, res) => {` block. Replace the destructuring line and computation of `subtotal`/`total` with the updated version below. Only the section from destructuring through order construction needs to change:

```js
router.post('/', customerAuth, async (req, res) => {
  try {
    const {
      items, shippingAddress, shippingCourier, shippingService,
      shippingServiceName, shippingCost, estimatedDays,
      voucherCode, voucherDiscount,
    } = req.body;

    if (!items?.length || !shippingAddress || !shippingCourier || shippingCost === undefined) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    // Fetch products from DB — never trust client prices
    const orderItems = [];
    for (const { productId, quantity } of items) {
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: `Produk ${productId} tidak ditemukan` });
      if (!product.priceNumeric) return res.status(400).json({ message: `Produk ${product.name} belum memiliki harga numeric` });
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.image || (product.images?.[0] ?? ''),
        priceNumeric: product.priceNumeric,
        weightGrams: product.weightGrams ?? 0,
        quantity,
        subtotal: product.priceNumeric * quantity,
      });
    }

    // Re-validate voucher server-side
    let appliedVoucherCode = '';
    let appliedVoucherDiscount = 0;
    let voucherDoc = null;

    if (voucherCode && Number(voucherDiscount) > 0) {
      voucherDoc = await Voucher.findOne({ code: voucherCode.toUpperCase(), isActive: true });
      if (!voucherDoc) return res.status(400).json({ message: 'Voucher tidak valid' });

      const now = new Date();
      const itemsSubtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
      if (
        now < voucherDoc.startDate || now > voucherDoc.endDate ||
        itemsSubtotal < voucherDoc.minOrderAmount ||
        (voucherDoc.usageLimit > 0 && voucherDoc.usedCount >= voucherDoc.usageLimit)
      ) {
        return res.status(400).json({ message: 'Voucher tidak dapat digunakan' });
      }

      appliedVoucherCode = voucherDoc.code;
      appliedVoucherDiscount = Number(voucherDiscount);
    }

    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    const total = subtotal - appliedVoucherDiscount + Number(shippingCost);

    const order = new Order({
      customer: req.customer._id,
      customerSnapshot: { name: req.customer.name, email: req.customer.email, phone: req.customer.phone },
      items: orderItems,
      subtotal,
      shippingCost: Number(shippingCost),
      voucherCode: appliedVoucherCode,
      voucherDiscount: appliedVoucherDiscount,
      total,
      shippingAddress,
      shippingCourier,
      shippingService,
      shippingServiceName: shippingServiceName ?? '',
      estimatedDays: estimatedDays ?? '',
    });
    await order.save();
    order.midtransOrderId = order._id.toString();

    // Build item_details for Midtrans (must sum to gross_amount)
    const itemDetails = orderItems.map((i) => ({
      id: i.product.toString(),
      price: i.priceNumeric,
      quantity: i.quantity,
      name: i.name.substring(0, 50),
    }));
    if (appliedVoucherDiscount > 0) {
      itemDetails.push({
        id: 'VOUCHER',
        price: -appliedVoucherDiscount,
        quantity: 1,
        name: `Diskon ${appliedVoucherCode}`,
      });
    }
    itemDetails.push({
      id: 'SHIPPING',
      price: Number(shippingCost),
      quantity: 1,
      name: `Ongkir ${shippingCourier.toUpperCase()} ${shippingService}`,
    });

    const snapTransaction = await snap.createTransaction({
      transaction_details: { order_id: order._id.toString(), gross_amount: total },
      customer_details: {
        first_name: req.customer.name,
        email: req.customer.email,
        phone: req.customer.phone,
        shipping_address: {
          first_name: shippingAddress.recipientName,
          phone: shippingAddress.phone,
          address: shippingAddress.street,
          city: shippingAddress.city,
          postal_code: shippingAddress.postalCode,
        },
      },
      item_details: itemDetails,
    });

    order.midtransToken = snapTransaction.token;
    await order.save();

    // Increment voucher usedCount after successful order creation
    if (voucherDoc) {
      await Voucher.findByIdAndUpdate(voucherDoc._id, { $inc: { usedCount: 1 } });
    }

    res.status(201).json({ orderId: order._id, snapToken: snapTransaction.token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

- [ ] **Step 3: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add routes/orderRoutes.js
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: handle voucher in order creation, re-validate server-side"
```

---

## Task 9: Update `routes/productRoutes.js` for carousel query

**Files:**
- Modify: `routes/productRoutes.js`

- [ ] **Step 1: Add `categories`, `exclude`, `limit` query param support**

Find the GET `/` handler. Replace the destructuring + query-building section:

Find this line:
```js
const { category, featured } = req.query;
let query = {};
```

Replace with:
```js
const { category, featured, categories, exclude, limit } = req.query;
const query = {};
```

After the existing `if (featured === 'true') query.isFeatured = true;` block, add:

```js
    if (categories) {
      const catIds = String(categories).split(',').filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
      if (catIds.length) query.category = { $in: catIds };
    }

    if (exclude) {
      const excludeIds = String(exclude).split(',').filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
      if (excludeIds.length) query._id = { $nin: excludeIds };
    }
```

Find the line:
```js
const products = await Product.find(query).populate('category');
```

Replace with:
```js
const productLimit = limit ? parseInt(String(limit), 10) : 0;
let productsQuery = Product.find(query).populate('category');
if (productLimit > 0) productsQuery = productsQuery.limit(productLimit);
const products = await productsQuery;
```

- [ ] **Step 2: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add routes/productRoutes.js
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add categories, exclude, limit query params to products route"
```

---

## Task 10: Register new routes in `server.js`

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add two new route registrations BEFORE the customers route**

Find this line in server.js:
```js
app.use('/api/customers', require('./routes/customerAuthRoutes'));
```

Insert before it:
```js
app.use('/api/customers/me/addresses', require('./routes/customerAddresses'));
app.use('/api/vouchers', require('./routes/vouchers'));
```

- [ ] **Step 2: Restart server and confirm no startup errors**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite; node -e "require('./server.js')" 2>&1 | Select-Object -First 5
```

Expected: server starts, no `Cannot find module` errors.

- [ ] **Step 3: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add server.js
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: register customer addresses and voucher routes"
```

---

## Task 11: Update `client/src/services/api.ts`

**Files:**
- Modify: `client/src/services/api.ts`

- [ ] **Step 1: Update getProducts signature, add address + voucher methods, type createOrder**

Find the `import type` line at the top and update it:
```ts
import type {
  WishlistProduct, Review, ReviewsResponse, CanReviewResponse,
  SavedAddress, VoucherValidation, CreateOrderPayload,
} from '../types/ecommerce';
```

Find `getProducts: async (params?: { category?: string; featured?: boolean }) => {` and update the full method:
```ts
  getProducts: async (params?: {
    category?: string;
    featured?: boolean;
    categories?: string;
    exclude?: string;
    limit?: number;
  }) => {
    const query: Record<string, string> = {};
    if (params?.category) query.category = params.category;
    if (params?.featured) query.featured = 'true';
    if (params?.categories) query.categories = params.categories;
    if (params?.exclude) query.exclude = params.exclude;
    if (params?.limit) query.limit = String(params.limit);
    const qs = new URLSearchParams(query).toString();
    const res = await fetch(`${API_BASE_URL}/products${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },
```

Find `createOrder: async (payload: object) => {` and replace with:
```ts
  createOrder: async (payload: CreateOrderPayload) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Gagal membuat pesanan' }));
      throw new Error(err.message ?? 'Gagal membuat pesanan');
    }
    return res.json();
  },
```

Add the following new methods at the end of the `api` object (before the closing `}`):

```ts
  // Customer Addresses
  getCustomerAddresses: async (): Promise<SavedAddress[]> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch addresses');
    return res.json();
  },

  addCustomerAddress: async (data: Omit<SavedAddress, '_id'>): Promise<SavedAddress> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add address');
    return res.json();
  },

  updateCustomerAddress: async (id: string, data: Partial<SavedAddress>): Promise<SavedAddress> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update address');
    return res.json();
  },

  deleteCustomerAddress: async (id: string): Promise<void> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete address');
  },

  setDefaultAddress: async (id: string): Promise<void> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses/${id}/default`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to set default address');
  },

  // Vouchers
  validateVoucher: async (code: string, subtotal: number): Promise<VoucherValidation> => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, subtotal }),
    });
    if (!res.ok) throw new Error('Failed to validate voucher');
    return res.json();
  },
```

- [ ] **Step 2: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/services/api.ts
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add address and voucher API methods, type createOrder payload"
```

---

## Task 12: Update `client/src/hooks/useApi.ts`

**Files:**
- Modify: `client/src/hooks/useApi.ts`

- [ ] **Step 1: Add import for new types**

Update the import at the top of the file to include:
```ts
import type { WishlistProduct, SavedAddress, VoucherValidation } from '../types/ecommerce';
```

- [ ] **Step 2: Add useCustomerAddresses and useVoucher hooks**

Append at end of file:

```ts
export function useCustomerAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCustomerAddresses();
      setAddresses(data);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addAddress = async (data: Omit<SavedAddress, '_id'>): Promise<SavedAddress> => {
    const result = await api.addCustomerAddress(data);
    await refresh();
    return result;
  };

  const updateAddress = async (id: string, data: Partial<SavedAddress>): Promise<SavedAddress> => {
    const result = await api.updateCustomerAddress(id, data);
    await refresh();
    return result;
  };

  const deleteAddress = async (id: string): Promise<void> => {
    await api.deleteCustomerAddress(id);
    setAddresses((prev) => prev.filter((a) => a._id !== id));
  };

  const setDefault = async (id: string): Promise<void> => {
    await api.setDefaultAddress(id);
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a._id === id })));
  };

  return { addresses, loading, addAddress, updateAddress, deleteAddress, setDefault, refresh };
}

export function useVoucher() {
  const [voucher, setVoucher] = useState<VoucherValidation | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async (code: string, subtotal: number): Promise<void> => {
    setApplying(true);
    setError(null);
    try {
      const result = await api.validateVoucher(code, subtotal);
      if (result.valid) {
        setVoucher(result);
      } else {
        setError(result.message);
        setVoucher(null);
      }
    } catch {
      setError('Gagal memvalidasi voucher');
    } finally {
      setApplying(false);
    }
  };

  const clear = () => {
    setVoucher(null);
    setError(null);
  };

  return { voucher, applying, error, apply, clear };
}
```

- [ ] **Step 3: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/hooks/useApi.ts
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add useCustomerAddresses and useVoucher hooks"
```

---

## Task 13: Update `ProductDetail.tsx` to snapshot discount + categoryId into cart

**Files:**
- Modify: `client/src/pages/ProductDetail.tsx`

- [ ] **Step 1: Pass originalPrice, discountPercent, categoryId to addToCart**

Find the `handleAddToCart` function (around line 134). Replace its body:

```ts
  const handleAddToCart = () => {
    if (!localStorage.getItem('customerToken')) {
      navigate(`/masuk?redirect=/produk/${id}`);
      return;
    }
    setAdding(true);

    const promo = product.activePromotion;
    const basePrice = selectedVariant !== null && selectedVariant.price > 0
      ? selectedVariant.price
      : (product.priceNumeric ?? 0);
    const discountedPrice = promo
      ? Math.round(basePrice * (1 - promo.discountPercent / 100))
      : basePrice;

    addToCart({
      productId: product._id,
      name: selectedVariant
        ? `${product.name} - ${selectedVariant.name}`
        : product.name,
      image: activeImage || product.image || '',
      priceNumeric: discountedPrice,
      weightGrams: selectedVariant?.weightGrams ?? product.weightGrams ?? 0,
      quantity: qty,
      originalPrice: promo ? basePrice : undefined,
      discountPercent: promo ? promo.discountPercent : undefined,
      categoryId: product.category?._id ?? undefined,
    });
    setTimeout(() => setAdding(false), 600);
  };
```

- [ ] **Step 2: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/pages/ProductDetail.tsx
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: snapshot discount and categoryId into cart item on add"
```

---

## Task 14: Create `CartItemCard.tsx`

**Files:**
- Create: `client/src/components/CartItemCard.tsx`

- [ ] **Step 1: Create component**

```tsx
import type { CartItem } from '../types/ecommerce';
import api from '../services/api';

interface Props {
  item: CartItem;
  selected: boolean;
  onToggle: () => void;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function CartItemCard({ item, selected, onToggle, onQtyChange, onRemove }: Props) {
  return (
    <div className={`bg-white rounded-2xl p-4 flex gap-3 items-start transition-shadow ${selected ? 'ring-2 ring-primary/40' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-1 w-4 h-4 accent-primary shrink-0 cursor-pointer"
      />
      <img
        src={api.getImageUrl(item.image)}
        alt={item.name}
        className="w-20 h-20 object-cover rounded-xl shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-black text-base leading-tight mb-1 truncate">{item.name}</p>
        {item.discountPercent !== undefined && item.originalPrice !== undefined && (
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-xs font-bold text-white bg-red-500 rounded-full px-2 py-0.5">
              {item.discountPercent}% OFF
            </span>
            <span className="text-sm text-black/40 line-through">{fmt(item.originalPrice)}</span>
          </div>
        )}
        <p className="text-primary font-semibold text-sm">{fmt(item.priceNumeric)}</p>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <button
          onClick={onRemove}
          className="text-xs text-red-500 hover:text-red-700 transition"
        >
          Hapus
        </button>
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-full px-2.5 py-1">
          <button
            onClick={() => onQtyChange(item.quantity - 1)}
            className="w-5 h-5 flex items-center justify-center text-black font-bold text-base leading-none"
          >
            −
          </button>
          <span className="text-sm font-medium w-5 text-center tabular-nums">{item.quantity}</span>
          <button
            onClick={() => onQtyChange(item.quantity + 1)}
            className="w-5 h-5 flex items-center justify-center text-black font-bold text-base leading-none"
          >
            +
          </button>
        </div>
        <p className="text-xs text-black/60 tabular-nums">{fmt(item.priceNumeric * item.quantity)}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/components/CartItemCard.tsx
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add CartItemCard component with discount display and checkbox"
```

---

## Task 15: Create `RelatedProductsCarousel.tsx`

**Files:**
- Create: `client/src/components/RelatedProductsCarousel.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import api from '../services/api';

interface RelatedProduct {
  _id: string;
  name: string;
  image: string;
  priceNumeric: number;
  activePromotion: { discountPercent: number } | null;
}

interface Props {
  categoryIds: string[];
  excludeIds: string[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function RelatedProductsCarousel({ categoryIds, excludeIds }: Props) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);

  useEffect(() => {
    if (!categoryIds.length) return;
    api.getProducts({
      categories: categoryIds.join(','),
      exclude: excludeIds.join(','),
      limit: 12,
    })
      .then((data: RelatedProduct[]) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, [categoryIds.join(','), excludeIds.join(',')]);

  if (!products.length) return null;

  return (
    <section className="bg-[#F9F7F2] pt-10 pb-16">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <h2 className="text-2xl font-bold text-black mb-6">Produk Lainnya</h2>
        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={16}
          slidesPerView={1.3}
          breakpoints={{
            480:  { slidesPerView: 2.2 },
            768:  { slidesPerView: 3.2 },
            1024: { slidesPerView: 4 },
            1280: { slidesPerView: 5 },
          }}
        >
          {products.map((p) => {
            const discount = p.activePromotion?.discountPercent;
            const discountedPrice = discount
              ? Math.round(p.priceNumeric * (1 - discount / 100))
              : p.priceNumeric;
            return (
              <SwiperSlide key={p._id}>
                <Link to={`/produk/${p._id}`} className="group block">
                  <div className="rounded-2xl bg-gray-100 overflow-hidden aspect-square mb-3">
                    <img
                      src={api.getImageUrl(p.image)}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <p className="text-sm font-bold text-black leading-tight mb-1 line-clamp-2">{p.name}</p>
                  {discount ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5">{discount}%</span>
                      <span className="text-xs text-black/40 line-through">{fmt(p.priceNumeric)}</span>
                      <span className="text-sm font-semibold text-primary">{fmt(discountedPrice)}</span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-primary">{fmt(p.priceNumeric)}</p>
                  )}
                </Link>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/components/RelatedProductsCarousel.tsx
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add RelatedProductsCarousel component"
```

---

## Task 16: Rewrite `Keranjang.tsx`

**Files:**
- Modify: `client/src/pages/Keranjang.tsx`

- [ ] **Step 1: Rewrite with checkbox selection, discount display, and related carousel**

```tsx
import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CartItem } from '../types/ecommerce';
import { getCart, removeFromCart, updateQty, getSelectedTotal } from '../utils/cart';
import CartItemCard from '../components/CartItemCard';
import RelatedProductsCarousel from '../components/RelatedProductsCarousel';
import Header from '../components/Header';
import Footer from '../components/Footer';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Keranjang() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) {
      navigate('/masuk?redirect=/keranjang');
      return;
    }
    const c = getCart();
    setCart(c);
    setSelectedIds(new Set(c.map((i) => i.productId)));
    const handler = () => {
      const updated = getCart();
      setCart(updated);
      setSelectedIds((prev) => {
        const next = new Set<string>();
        for (const item of updated) {
          if (prev.has(item.productId)) next.add(item.productId);
        }
        return next;
      });
    };
    window.addEventListener('cartUpdated', handler);
    return () => window.removeEventListener('cartUpdated', handler);
  }, [navigate]);

  const allSelected = cart.length > 0 && cart.every((i) => selectedIds.has(i.productId));
  const selectedCount = useMemo(
    () => cart.filter((i) => selectedIds.has(i.productId)).reduce((s, i) => s + i.quantity, 0),
    [cart, selectedIds],
  );
  const selectedTotal = useMemo(() => getSelectedTotal(selectedIds), [cart, selectedIds]);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cart.map((i) => i.productId)));
    }
  };

  const toggleItem = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleCheckout = () => {
    if (!localStorage.getItem('customerToken')) {
      navigate('/masuk?redirect=/checkout');
      return;
    }
    navigate('/checkout', { state: { selectedIds: [...selectedIds] } });
  };

  const categoryIds = useMemo(
    () => [...new Set(cart.map((i) => i.categoryId).filter((id): id is string => !!id))],
    [cart],
  );
  const productIds = useMemo(() => cart.map((i) => i.productId), [cart]);

  if (cart.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center px-4 py-20">
          <p className="text-2xl font-bold text-black mb-4">Keranjang Kosong</p>
          <p className="text-black/60 mb-8">Belum ada produk di keranjang kamu.</p>
          <Link
            to="/produk"
            className="inline-flex items-center px-8 py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full transition"
          >
            Lihat Produk
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F9F7F2] pt-10 pb-0">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 pb-16">
          <h1 className="text-3xl font-bold text-black mb-6">Keranjang Belanja</h1>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Item list */}
            <div className="flex-1 min-w-0">
              {/* Select all */}
              <label className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 mb-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium text-black">
                  Pilih Semua ({cart.length} produk)
                </span>
              </label>

              <div className="space-y-3">
                {cart.map((item) => (
                  <CartItemCard
                    key={item.productId}
                    item={item}
                    selected={selectedIds.has(item.productId)}
                    onToggle={() => toggleItem(item.productId)}
                    onQtyChange={(qty) => updateQty(item.productId, qty)}
                    onRemove={() => removeFromCart(item.productId)}
                  />
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="lg:w-72 shrink-0">
              <div className="bg-white rounded-2xl p-6 sticky top-24">
                <h2 className="text-base font-bold text-black mb-4">Ringkasan</h2>
                <div className="flex justify-between text-sm text-black/70 mb-1">
                  <span>Produk dipilih</span>
                  <span>{selectedCount} item</span>
                </div>
                <div className="flex justify-between text-sm text-black/60 mb-4">
                  <span>Ongkir</span>
                  <span>Dihitung saat checkout</span>
                </div>
                <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-black mb-6">
                  <span>Subtotal</span>
                  <span>{fmt(selectedTotal)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={selectedIds.size === 0}
                  className="w-full py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 text-sm"
                >
                  {selectedIds.size > 0
                    ? `Checkout (${selectedIds.size} Produk)`
                    : 'Pilih Produk'}
                </button>
                <Link
                  to="/produk"
                  className="block text-center text-sm text-black/60 mt-4 hover:text-black"
                >
                  Lanjut Belanja
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Related products carousel — above footer */}
        {categoryIds.length > 0 && (
          <RelatedProductsCarousel
            categoryIds={categoryIds}
            excludeIds={productIds}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

- [ ] **Step 3: Run dev server, open `/keranjang`, verify:**
  - Each item has checkbox
  - "Pilih Semua" toggles all
  - Subtotal updates when items toggled
  - Checkout button shows selected count
  - Checkout button disabled when none selected
  - Items with discount show badge + strikethrough price
  - Carousel appears below cart (if items have categoryId)

- [ ] **Step 4: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/pages/Keranjang.tsx
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: rewrite Keranjang with checkbox selection, discount display, related carousel"
```

---

## Task 17: Create `AddressSelector.tsx`

**Files:**
- Create: `client/src/components/AddressSelector.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useState } from 'react';
import type { ShippingAddress, SavedAddress, BiteshipArea } from '../types/ecommerce';
import { useCustomerAddresses } from '../hooks/useApi';
import api from '../services/api';

interface Props {
  selected: ShippingAddress | null;
  onSelect: (address: ShippingAddress) => void;
}

const emptyForm = {
  label: '',
  recipientName: '',
  phone: '',
  street: '',
  areaId: '',
  areaName: '',
  city: '',
  province: '',
  postalCode: '',
  saveToProfile: false,
  isDefault: false,
};

export default function AddressSelector({ selected, onSelect }: Props) {
  const { addresses, loading, addAddress } = useCustomerAddresses();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [areaKeyword, setAreaKeyword] = useState('');
  const [areaResults, setAreaResults] = useState<BiteshipArea[]>([]);
  const [saving, setSaving] = useState(false);
  const [areaTimer, setAreaTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleAreaSearch = (keyword: string) => {
    setAreaKeyword(keyword);
    setForm((f) => ({ ...f, areaId: '', areaName: '', city: '', province: '', postalCode: '' }));
    if (areaTimer) clearTimeout(areaTimer);
    if (keyword.length < 3) { setAreaResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchAreas(keyword);
        setAreaResults(Array.isArray(results) ? results : []);
      } catch { setAreaResults([]); }
    }, 500);
    setAreaTimer(timer);
  };

  const selectArea = (area: BiteshipArea) => {
    const label = `${area.administrative_division_level_3_name}, ${area.administrative_division_level_2_name}, ${area.administrative_division_level_1_name}`;
    setForm((f) => ({
      ...f,
      areaId: area.area_id,
      areaName: label,
      city: area.administrative_division_level_2_name,
      province: area.administrative_division_level_1_name,
      postalCode: area.postal_code,
    }));
    setAreaKeyword(label);
    setAreaResults([]);
  };

  const handleUseAddress = (addr: SavedAddress) => {
    onSelect({
      recipientName: addr.recipientName,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      province: addr.province,
      postalCode: addr.postalCode,
      areaId: addr.areaId,
      areaName: addr.areaName,
    });
  };

  const handleConfirmNew = async () => {
    if (!form.recipientName || !form.phone || !form.street || !form.areaId) return;
    setSaving(true);
    try {
      const addressData = {
        label: form.label,
        recipientName: form.recipientName,
        phone: form.phone,
        street: form.street,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        areaId: form.areaId,
        areaName: form.areaName,
        isDefault: form.isDefault,
      };
      if (form.saveToProfile) {
        await addAddress(addressData);
      }
      onSelect({
        recipientName: form.recipientName,
        phone: form.phone,
        street: form.street,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        areaId: form.areaId,
        areaName: form.areaName,
      });
      setShowForm(false);
      setForm(emptyForm);
      setAreaKeyword('');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm';

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <p className="text-sm text-black/60 py-2">Belum ada alamat tersimpan.</p>
      ) : (
        <div className="space-y-2">
          {addresses.map((addr) => {
            const isSelected =
              selected?.areaId === addr.areaId && selected?.street === addr.street;
            return (
              <div
                key={addr._id}
                className={`border rounded-xl p-4 cursor-pointer transition ${isSelected ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => handleUseAddress(addr)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {addr.label && (
                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {addr.label}
                        </span>
                      )}
                      {addr.isDefault && (
                        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Utama
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-black">{addr.recipientName}</p>
                    <p className="text-xs text-black/60">{addr.phone}</p>
                    <p className="text-xs text-black/60 mt-0.5">{addr.street}, {addr.areaName}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 mt-1 shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-black/60 hover:border-primary hover:text-primary transition"
        >
          + Tambah Alamat Baru
        </button>
      )}

      {showForm && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <p className="text-sm font-bold text-black">Alamat Baru</p>
          <input
            type="text"
            placeholder="Label (contoh: Rumah, Kantor)"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="Nama penerima"
            value={form.recipientName}
            onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
            className={inputCls}
          />
          <input
            type="tel"
            placeholder="Nomor HP penerima"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="Alamat lengkap (jalan, nomor, RT/RW)"
            value={form.street}
            onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
            className={inputCls}
          />
          <div className="relative">
            <input
              type="text"
              placeholder="Cari kecamatan / kota (min. 3 huruf)"
              value={areaKeyword}
              onChange={(e) => handleAreaSearch(e.target.value)}
              className={inputCls}
            />
            {areaResults.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                {areaResults.map((area) => (
                  <li
                    key={area.area_id}
                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm"
                    onClick={() => selectArea(area)}
                  >
                    {area.administrative_division_level_3_name},{' '}
                    {area.administrative_division_level_2_name},{' '}
                    {area.administrative_division_level_1_name}{' '}
                    {area.postal_code}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-black/70 cursor-pointer">
            <input
              type="checkbox"
              checked={form.saveToProfile}
              onChange={(e) => setForm((f) => ({ ...f, saveToProfile: e.target.checked }))}
              className="accent-primary"
            />
            Simpan ke profil
          </label>
          {form.saveToProfile && (
            <label className="flex items-center gap-2 text-sm text-black/70 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="accent-primary"
              />
              Jadikan alamat utama
            </label>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm); setAreaKeyword(''); }}
              className="flex-1 py-2.5 border border-gray-200 rounded-full text-sm text-black/70 hover:bg-gray-100 transition"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmNew}
              disabled={saving || !form.recipientName || !form.phone || !form.street || !form.areaId}
              className="flex-1 py-2.5 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-sm rounded-full disabled:opacity-50 transition"
            >
              {saving ? 'Menyimpan...' : 'Gunakan Alamat Ini'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/components/AddressSelector.tsx
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add AddressSelector component with saved addresses and inline form"
```

---

## Task 18: Create `ShippingSelector.tsx`

**Files:**
- Create: `client/src/components/ShippingSelector.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useState, useEffect, useCallback } from 'react';
import type { ShippingAddress, ShippingRate, CartItem } from '../types/ecommerce';
import api from '../services/api';

interface Props {
  address: ShippingAddress;
  cart: CartItem[];
  onSelect: (rate: ShippingRate | null) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function ShippingSelector({ address, cart, onSelect }: Props) {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selected, setSelected] = useState<ShippingRate | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRates = useCallback(async () => {
    if (!address.areaId || !cart.length) return;
    setLoading(true);
    setRates([]);
    setSelected(null);
    onSelect(null);
    try {
      const items = cart.map((c) => ({
        name: c.name,
        priceNumeric: c.priceNumeric,
        weightGrams: c.weightGrams,
        quantity: c.quantity,
        dimensions: { length: 1, width: 1, height: 1 },
      }));
      const result = await api.getShippingRates({ destinationAreaId: address.areaId, items });
      setRates(Array.isArray(result) ? result : []);
    } catch {
      setRates([]);
    } finally {
      setLoading(false);
    }
  }, [address.areaId, cart]);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const handleSelect = (rate: ShippingRate) => {
    setSelected(rate);
    onSelect(rate);
  };

  if (loading) {
    return <p className="text-sm text-black/60 py-2">Mengambil tarif pengiriman...</p>;
  }

  if (!rates.length) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-black/60">Tidak ada kurir tersedia untuk tujuan ini.</p>
        <button
          onClick={fetchRates}
          className="text-sm text-primary hover:underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rates.map((rate, i) => (
        <label
          key={i}
          className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${selected === rate ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="shippingRate"
              checked={selected === rate}
              onChange={() => handleSelect(rate)}
              className="accent-primary"
            />
            <div>
              <p className="font-medium text-sm text-black">
                {rate.courier_name} — {rate.courier_service_name}
              </p>
              <p className="text-xs text-black/60">{rate.duration}</p>
            </div>
          </div>
          <span className="text-sm font-bold text-black shrink-0">{fmt(rate.price)}</span>
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/components/ShippingSelector.tsx
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add ShippingSelector component extracted from Checkout"
```

---

## Task 19: Create `VoucherInput.tsx`

**Files:**
- Create: `client/src/components/VoucherInput.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useState } from 'react';
import type { VoucherValidation } from '../types/ecommerce';
import { useVoucher } from '../hooks/useApi';

interface Props {
  subtotal: number;
  onApply: (validation: VoucherValidation) => void;
  onClear: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function VoucherInput({ subtotal, onApply, onClear }: Props) {
  const [code, setCode] = useState('');
  const { voucher, applying, error, apply, clear } = useVoucher();

  const handleApply = async () => {
    if (!code.trim()) return;
    await apply(code.trim(), subtotal);
  };

  const handleClear = () => {
    clear();
    setCode('');
    onClear();
  };

  // Notify parent when voucher is set
  if (voucher?.valid && voucher.discountAmount) {
    onApply(voucher);
  }

  return (
    <div className="space-y-2">
      {voucher?.valid ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-bold text-green-700">{code.toUpperCase()}</p>
            <p className="text-xs text-green-600">Hemat {fmt(voucher.discountAmount ?? 0)}</p>
          </div>
          <button
            onClick={handleClear}
            className="text-green-700 hover:text-red-600 transition text-lg leading-none"
            aria-label="Hapus voucher"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Kode voucher"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') handleApply(); }}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm uppercase"
          />
          <button
            onClick={handleApply}
            disabled={applying || !code.trim()}
            className="px-5 py-2.5 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition whitespace-nowrap"
          >
            {applying ? '...' : 'Pakai'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/components/VoucherInput.tsx
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: add VoucherInput component"
```

---

## Task 20: Rewrite `Checkout.tsx`

**Files:**
- Modify: `client/src/pages/Checkout.tsx`

- [ ] **Step 1: Rewrite with AddressSelector, ShippingSelector, VoucherInput**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { CartItem, ShippingAddress, ShippingRate, VoucherValidation } from '../types/ecommerce';
import { getCart, clearCart } from '../utils/cart';
import api from '../services/api';
import AddressSelector from '../components/AddressSelector';
import ShippingSelector from '../components/ShippingSelector';
import VoucherInput from '../components/VoucherInput';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface LocationState {
  selectedIds?: string[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherValidation | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (!token) { navigate('/masuk?redirect=/checkout'); return; }

    const allCart = getCart();
    const state = location.state as LocationState | null;
    const selectedIds = state?.selectedIds;

    const filtered = selectedIds?.length
      ? allCart.filter((c) => selectedIds.includes(c.productId))
      : allCart;

    if (!filtered.length) { navigate('/keranjang'); return; }
    setCart(filtered);
  }, [navigate, location.state]);

  const subtotal = cart.reduce((s, c) => s + c.priceNumeric * c.quantity, 0);
  const voucherDiscount = appliedVoucher?.discountAmount ?? 0;
  const shippingCost = selectedRate?.price ?? 0;
  const total = subtotal - voucherDiscount + shippingCost;

  const handlePay = useCallback(async () => {
    if (!selectedAddress || !selectedRate) return;
    setPaying(true);
    try {
      const result = await api.createOrder({
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        shippingAddress: selectedAddress,
        shippingCourier: selectedRate.courier_code,
        shippingService: selectedRate.courier_service_code,
        shippingServiceName: `${selectedRate.courier_name} ${selectedRate.courier_service_name}`,
        shippingCost: selectedRate.price,
        estimatedDays: selectedRate.duration,
        voucherCode: appliedVoucher?.voucherId ? (appliedVoucher as VoucherValidation & { code?: string }).code : undefined,
        voucherDiscount: voucherDiscount > 0 ? voucherDiscount : undefined,
      });

      if (!result.snapToken) {
        alert(result.message ?? 'Gagal membuat pesanan');
        setPaying(false);
        return;
      }

      clearCart();

      window.snap.pay(result.snapToken, {
        onSuccess:  () => navigate(`/pesanan/${result.orderId}`),
        onPending:  () => navigate(`/pesanan/${result.orderId}`),
        onError:    () => { alert('Pembayaran gagal, silakan coba lagi.'); setPaying(false); },
        onClose:    () => { navigate(`/pesanan/${result.orderId}`); },
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan, coba lagi.');
      setPaying(false);
    }
  }, [cart, selectedAddress, selectedRate, appliedVoucher, voucherDiscount, navigate]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F9F7F2] pt-10 pb-20">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <h1 className="text-3xl font-bold text-black mb-8">Checkout</h1>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left — form */}
            <div className="flex-1 space-y-6">

              {/* Address */}
              <div className="bg-white rounded-2xl p-6">
                <h2 className="text-base font-bold text-black mb-4">Alamat Pengiriman</h2>
                <AddressSelector
                  selected={selectedAddress}
                  onSelect={(addr) => {
                    setSelectedAddress(addr);
                    setSelectedRate(null);
                    setAppliedVoucher(null);
                  }}
                />
                {selectedAddress && (
                  <div className="mt-3 p-3 bg-green-50 rounded-xl text-sm text-green-800">
                    <p className="font-semibold">{selectedAddress.recipientName} · {selectedAddress.phone}</p>
                    <p className="text-xs text-green-700 mt-0.5">{selectedAddress.street}, {selectedAddress.areaName}</p>
                  </div>
                )}
              </div>

              {/* Shipping */}
              {selectedAddress && (
                <div className="bg-white rounded-2xl p-6">
                  <h2 className="text-base font-bold text-black mb-4">Pilih Pengiriman</h2>
                  <ShippingSelector
                    address={selectedAddress}
                    cart={cart}
                    onSelect={setSelectedRate}
                  />
                </div>
              )}

              {/* Voucher */}
              {selectedRate && (
                <div className="bg-white rounded-2xl p-6">
                  <h2 className="text-base font-bold text-black mb-4">Kode Voucher</h2>
                  <VoucherInput
                    subtotal={subtotal}
                    onApply={(v) => setAppliedVoucher(v)}
                    onClear={() => setAppliedVoucher(null)}
                  />
                </div>
              )}
            </div>

            {/* Right — summary */}
            <div className="lg:w-80 shrink-0">
              <div className="bg-white rounded-2xl p-6 sticky top-24">
                <h2 className="text-base font-bold text-black mb-4">Ringkasan Pesanan</h2>

                {/* Items */}
                <div className="space-y-2 mb-4">
                  {cart.map((c) => (
                    <div key={c.productId} className="flex justify-between text-sm text-black/70">
                      <span className="truncate max-w-[160px]">{c.name} ×{c.quantity}</span>
                      <span className="shrink-0 tabular-nums">{fmt(c.priceNumeric * c.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm text-black/70">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{fmt(subtotal)}</span>
                  </div>
                  {voucherDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Diskon voucher</span>
                      <span className="tabular-nums">− {fmt(voucherDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Ongkir</span>
                    <span className="tabular-nums">{selectedRate ? fmt(selectedRate.price) : '—'}</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold text-black mb-6">
                  <span>Total</span>
                  <span className="tabular-nums">{fmt(total)}</span>
                </div>

                <button
                  onClick={handlePay}
                  disabled={!selectedAddress || !selectedRate || paying}
                  className="w-full py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 text-sm"
                >
                  {paying ? 'Memproses...' : 'Bayar Sekarang'}
                </button>

                {(!selectedAddress || !selectedRate) && (
                  <p className="text-center text-xs text-black/40 mt-3">
                    {!selectedAddress ? 'Pilih alamat pengiriman terlebih dahulu' : 'Pilih metode pengiriman terlebih dahulu'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Fix VoucherInput onApply callback issue**

The `onApply` in VoucherInput calls `onApply(voucher)` inside the render function which causes infinite re-renders. Fix `VoucherInput.tsx` — remove the inline call and use `useEffect` instead:

Find in `VoucherInput.tsx`:
```ts
  // Notify parent when voucher is set
  if (voucher?.valid && voucher.discountAmount) {
    onApply(voucher);
  }
```

Replace with a `useEffect` (add `useEffect` to the import):
```ts
import { useState, useEffect } from 'react';
```

And replace the inline call with:
```ts
  useEffect(() => {
    if (voucher?.valid && voucher.discountAmount) {
      onApply(voucher);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucher]);
```

Also store the applied code in `useVoucher` so Checkout can send it to backend. Update `VoucherInput.tsx` to track the code at apply time:

In `handleApply`:
```ts
  const handleApply = async () => {
    if (!code.trim()) return;
    await apply(code.trim(), subtotal);
  };
```

And in the success chip, show `code` state (already tracked). The Checkout needs to send the code string — update `Checkout.tsx` to track `voucherCode` state separately:

In Checkout.tsx, replace:
```ts
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherValidation | null>(null);
```
with:
```ts
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherValidation | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
```

Update `onApply` prop on VoucherInput:
```tsx
<VoucherInput
  subtotal={subtotal}
  onApply={(v, code) => { setAppliedVoucher(v); setVoucherCode(code); }}
  onClear={() => { setAppliedVoucher(null); setVoucherCode(''); }}
/>
```

Update `VoucherInput.tsx` Props and `onApply` signature:
```ts
interface Props {
  subtotal: number;
  onApply: (validation: VoucherValidation, code: string) => void;
  onClear: () => void;
}
```

Update the `useEffect` in VoucherInput:
```ts
  useEffect(() => {
    if (voucher?.valid && voucher.discountAmount) {
      onApply(voucher, code);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucher]);
```

Update Checkout `handlePay` to use `voucherCode` state:
```ts
        voucherCode: voucherCode || undefined,
        voucherDiscount: voucherDiscount > 0 ? voucherDiscount : undefined,
```

Remove the cast `(appliedVoucher as VoucherValidation & { code?: string }).code`.

- [ ] **Step 3: Verify types compile**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

- [ ] **Step 4: Run dev server, open checkout flow, verify:**
  - Saved addresses appear as selectable cards
  - "Tambah Alamat Baru" expands inline form with area search
  - Checking "Simpan ke profil" saves to backend
  - After address selected, shipping rates appear
  - After shipping selected, voucher input appears
  - Valid voucher shows green chip + discount in summary
  - Invalid voucher shows error message
  - Pay button enabled only when address + shipping selected
  - Summary shows subtotal, discount (if any), ongkir, total
  - Midtrans Snap popup opens on Pay

- [ ] **Step 5: Commit**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add client/src/pages/Checkout.tsx client/src/components/VoucherInput.tsx
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "feat: rewrite Checkout with address selector, shipping, voucher, and summary"
```

---

## Task 21: Final type-check, lint, and cleanup

**Files:**
- All modified frontend files

- [ ] **Step 1: Run full TypeScript check**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run lint**

```powershell
cd G:\WebsiteDevelopment\KatigaWebsite\client; npm run lint
```

Fix any reported errors. Common issues:
- Missing `key` props in lists
- Unused imports
- `react-hooks/exhaustive-deps` warnings on the VoucherInput `useEffect` (suppress with comment if intentional)

- [ ] **Step 3: Commit any lint fixes**

```powershell
git -C "G:\WebsiteDevelopment\KatigaWebsite" add -A
git -C "G:\WebsiteDevelopment\KatigaWebsite" commit -m "chore: fix lint errors in cart and checkout feature"
```

---

## Self-Review Notes

- **Spec coverage:** All 18 files covered. Voucher admin page correctly excluded (out of scope per spec §8).
- **Midtrans item_details:** voucher added as negative line item so `sum(item_details) == gross_amount`. ✓
- **Per-user voucher check:** uses `Order.countDocuments` — no extra model field needed. ✓
- **`categories` query param** in productRoutes: uses `$in` with ObjectId validation. `exclude` uses `$nin`. ✓
- **Cart selection state:** lives in component `Set<string>`, not persisted — intentional, resets on page reload. ✓
- **`defaultAddress` sync:** customerAddresses route updates `customer.defaultAddress` when isDefault changes. ✓
- **VoucherInput re-render fix:** `useEffect` with `[voucher]` dep prevents render-phase side effect. ✓
