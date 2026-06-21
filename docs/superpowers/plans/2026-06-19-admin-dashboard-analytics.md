# Admin Dashboard Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend admin Laporan into a 4-tab analytics page (Penjualan/Produk/Pelanggan/Promosi & Voucher) backed by 3 new + 1 extended `/api/reports/*` endpoints, plus 2 new highlight cards on the admin Dashboard home.

**Architecture:** `routes/reportRoutes.js` gains 3 new auth-protected routes (`/products`, `/customers`, `/promotions`) plus 2 facets + 1 field on the existing `/summary` route, all reusing the existing `getDateFilter`/`toCountRecord` helpers and `$facet` aggregation style. The frontend `Laporan.tsx` page becomes a thin shell (range selector + shadcn `Tabs`) that renders 4 new tab components, each with its own data hook — so each tab only fetches when the admin actually opens it (Base UI `Tabs.Panel` unmounts inactive panels by default). `Dashboard.tsx` adds 2 derived/cheap stat cards from the already-extended `/summary` response.

**Tech Stack:** Express + Mongoose (backend), React + TypeScript + Vite, shadcn/ui (`Tabs`, `Table`, `Select`, `Card`, `Button`, `chart`/recharts — all already installed, no new installs needed).

**No automated tests:** this project has no test suite (per CLAUDE.md). Every task's verification step is either a direct API call against the running dev server (PowerShell `Invoke-RestMethod`) or a manual browser check, plus `npx tsc --noEmit` / `npm run lint` for frontend changes.

**Before starting:** make sure the dev server is running (`npm run dev` from the project root — backend on :5000, frontend on :5173) and you know your local admin login. The seed script (`npm run seed`) creates `admin@kumakuma.com` / `admin123` — the verification commands below use that; substitute your own if your local DB has a different admin.

---

### Task 1: Extend `GET /api/reports/summary` with payment/courier breakdown + new customer count

**Files:**
- Modify: `routes/reportRoutes.js`

- [ ] **Step 1: Add the `Customer` import**

In `routes/reportRoutes.js`, find:

```js
const auth = require('../middleware/auth');
const Order = require('../models/Order');

function getDateFilter(range) {
```

Replace with:

```js
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

function getDateFilter(range) {
```

- [ ] **Step 2: Add the two new facets to the `/summary` aggregation**

Find:

```js
          topProducts: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                name: { $first: '$items.name' },
                revenue: { $sum: '$items.subtotal' },
                quantity: { $sum: '$items.quantity' },
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]);

    res.json({
```

Replace with:

```js
          topProducts: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                name: { $first: '$items.name' },
                revenue: { $sum: '$items.subtotal' },
                quantity: { $sum: '$items.quantity' },
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
          ],
          paymentTypeCounts: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $group: { _id: '$midtransPaymentType', count: { $sum: 1 } } },
          ],
          courierCounts: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $group: { _id: '$shippingServiceName', count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    const newCustomersCount = await Customer.countDocuments(
      dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}
    );

    res.json({
```

- [ ] **Step 3: Add the 3 new fields to the response**

Find:

```js
      topProducts: result.topProducts.map((p) => ({
        productId: p._id?.toString() ?? '',
        name: p.name,
        revenue: p.revenue,
        quantity: p.quantity,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

Replace with:

```js
      topProducts: result.topProducts.map((p) => ({
        productId: p._id?.toString() ?? '',
        name: p.name,
        revenue: p.revenue,
        quantity: p.quantity,
      })),
      paymentTypeCounts: toCountRecord(result.paymentTypeCounts),
      courierCounts: toCountRecord(result.courierCounts),
      newCustomersCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 4: Verify against the running dev server**

Make sure `npm run dev` is running, then in PowerShell:

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@kumakuma.com","password":"admin123"}'
$token = $login.token
Invoke-RestMethod -Uri "http://localhost:5000/api/reports/summary?range=30d" -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 5
```

Expected: JSON response includes `paymentTypeCounts`, `courierCounts`, and `newCustomersCount` alongside the existing fields (`totalRevenue`, `orderCount`, `trend`, `paymentStatusCounts`, `orderStatusCounts`, `topProducts`). Empty objects/`0` are fine if there's no data yet — that's not a failure.

- [ ] **Step 5: Commit**

```bash
git add routes/reportRoutes.js
git commit -m "feat: add payment method and courier breakdown to sales report"
```

---

### Task 2: Add `GET /api/reports/products`

**Files:**
- Modify: `routes/reportRoutes.js`

- [ ] **Step 1: Add `Product` and `ProductCategory` imports**

Find:

```js
const Order = require('../models/Order');
const Customer = require('../models/Customer');

function getDateFilter(range) {
```

Replace with:

```js
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');

function getDateFilter(range) {
```

- [ ] **Step 2: Add the `/products` route handler**

Find:

```js
});

module.exports = router;
```

Replace with:

```js
});

// ─── GET /api/reports/products — admin: product performance report ───
router.get('/products', auth, async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const dateFilter = getDateFilter(range);

    const [result] = await Order.aggregate([
      {
        $facet: {
          topByRevenue: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                name: { $first: '$items.name' },
                revenue: { $sum: '$items.subtotal' },
                quantity: { $sum: '$items.quantity' },
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 },
          ],
          topByQuantity: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                name: { $first: '$items.name' },
                revenue: { $sum: '$items.subtotal' },
                quantity: { $sum: '$items.quantity' },
              },
            },
            { $sort: { quantity: -1 } },
            { $limit: 10 },
          ],
          soldProductIds: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $unwind: '$items' },
            { $group: { _id: '$items.product' } },
          ],
          categoryPerformance: [
            { $match: { paymentStatus: 'paid', ...dateFilter } },
            { $unwind: '$items' },
            {
              $lookup: {
                from: Product.collection.name,
                localField: 'items.product',
                foreignField: '_id',
                as: 'p',
              },
            },
            { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: '$p.category',
                revenue: { $sum: '$items.subtotal' },
                quantity: { $sum: '$items.quantity' },
              },
            },
            {
              $lookup: {
                from: ProductCategory.collection.name,
                localField: '_id',
                foreignField: '_id',
                as: 'c',
              },
            },
            { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                categoryId: '$_id',
                name: { $ifNull: ['$c.name', 'Tanpa Kategori'] },
                revenue: 1,
                quantity: 1,
              },
            },
            { $sort: { revenue: -1 } },
          ],
        },
      },
    ]);

    const soldIds = result.soldProductIds.map((r) => r._id).filter(Boolean);
    const [unsoldProducts, unsoldCount, topRated] = await Promise.all([
      Product.find({ _id: { $nin: soldIds } })
        .select('name image ratingAvg reviewCount')
        .limit(10),
      Product.countDocuments({ _id: { $nin: soldIds } }),
      Product.find().sort({ reviewCount: -1 }).select('name image ratingAvg reviewCount').limit(10),
    ]);

    const mapProductRow = (p) => ({
      productId: p._id?.toString() ?? '',
      name: p.name,
      revenue: p.revenue,
      quantity: p.quantity,
    });

    res.json({
      topByRevenue: result.topByRevenue.map(mapProductRow),
      topByQuantity: result.topByQuantity.map(mapProductRow),
      unsoldProducts: unsoldProducts.map((p) => ({
        productId: p._id.toString(),
        name: p.name,
        image: p.image,
        ratingAvg: p.ratingAvg,
        reviewCount: p.reviewCount,
      })),
      unsoldCount,
      topRated: topRated.map((p) => ({
        productId: p._id.toString(),
        name: p.name,
        image: p.image,
        ratingAvg: p.ratingAvg,
        reviewCount: p.reviewCount,
      })),
      categoryPerformance: result.categoryPerformance.map((c) => ({
        categoryId: c.categoryId?.toString() ?? null,
        name: c.name,
        revenue: c.revenue,
        quantity: c.quantity,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 3: Verify against the running dev server**

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@kumakuma.com","password":"admin123"}'
$token = $login.token
Invoke-RestMethod -Uri "http://localhost:5000/api/reports/products?range=30d" -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 5
```

Expected: JSON with keys `topByRevenue`, `topByQuantity`, `unsoldProducts`, `unsoldCount`, `topRated`, `categoryPerformance` (arrays may be empty if no orders/products exist yet — that's fine, a 500 error is the only failure).

- [ ] **Step 4: Commit**

```bash
git add routes/reportRoutes.js
git commit -m "feat: add product performance report endpoint"
```

---

### Task 3: Add `GET /api/reports/customers`

**Files:**
- Modify: `routes/reportRoutes.js`

- [ ] **Step 1: Add the `/customers` route handler**

No new imports needed (`Order` and `Customer` are already imported from Task 1). Find:

```js
});

module.exports = router;
```

Replace with:

```js
});

// ─── GET /api/reports/customers — admin: customer insights report ───
router.get('/customers', auth, async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const dateFilter = getDateFilter(range);

    const totalRegistered = await Customer.countDocuments();
    const newCustomers = await Customer.countDocuments(
      dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}
    );
    const suspendedCount = await Customer.countDocuments({ suspended: true });

    const topSpenders = await Order.aggregate([
      { $match: { paymentStatus: 'paid', ...dateFilter } },
      { $group: { _id: '$customer', total: { $sum: '$total' }, orderCount: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: Customer.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'c',
        },
      },
      { $unwind: '$c' },
      {
        $project: {
          customerId: '$_id',
          name: '$c.name',
          email: '$c.email',
          total: 1,
          orderCount: 1,
        },
      },
    ]);

    let newBuyers = null;
    let returningBuyers = null;
    const rangeStart = dateFilter.createdAt?.$gte;
    if (rangeStart) {
      const inRangeCustomerIds = await Order.distinct('customer', { paymentStatus: 'paid', ...dateFilter });
      const returningIds = await Order.distinct('customer', {
        paymentStatus: 'paid',
        customer: { $in: inRangeCustomerIds },
        createdAt: { $lt: rangeStart },
      });
      returningBuyers = returningIds.length;
      newBuyers = inRangeCustomerIds.length - returningIds.length;
    }

    res.json({
      totalRegistered,
      newCustomers,
      suspendedCount,
      topSpenders: topSpenders.map((s) => ({
        customerId: s.customerId?.toString() ?? '',
        name: s.name,
        email: s.email,
        total: s.total,
        orderCount: s.orderCount,
      })),
      newBuyers,
      returningBuyers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 2: Verify against the running dev server**

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@kumakuma.com","password":"admin123"}'
$token = $login.token
Invoke-RestMethod -Uri "http://localhost:5000/api/reports/customers?range=30d" -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 5
```

Expected: JSON with `totalRegistered`, `newCustomers`, `suspendedCount`, `topSpenders` (array), `newBuyers`, `returningBuyers`.

Then verify the `range=all` edge case returns `null` for the new/returning split:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/reports/customers?range=all" -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 5
```

Expected: `newBuyers` and `returningBuyers` are both `null`.

- [ ] **Step 3: Commit**

```bash
git add routes/reportRoutes.js
git commit -m "feat: add customer insights report endpoint"
```

---

### Task 4: Add `GET /api/reports/promotions`

**Files:**
- Modify: `routes/reportRoutes.js`

- [ ] **Step 1: Add `Voucher` and `Promotion` imports**

Find:

```js
const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');

function getDateFilter(range) {
```

Replace with:

```js
const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');
const Voucher = require('../models/Voucher');
const Promotion = require('../models/Promotion');

function getDateFilter(range) {
```

- [ ] **Step 2: Add the `/promotions` route handler**

Find:

```js
});

module.exports = router;
```

Replace with:

```js
});

// ─── GET /api/reports/promotions — admin: promotion & voucher report ───
router.get('/promotions', auth, async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const dateFilter = getDateFilter(range);
    const now = new Date();

    const vouchers = await Voucher.find().sort({ createdAt: -1 });
    const voucherStatus = (v) => {
      if (!v.isActive) return 'nonaktif';
      if (now < v.startDate) return 'terjadwal';
      if (now > v.endDate) return 'berakhir';
      return 'aktif';
    };

    const voucherPerformance = await Order.aggregate([
      { $match: { paymentStatus: 'paid', voucherCode: { $ne: '' }, ...dateFilter } },
      {
        $group: {
          _id: '$voucherCode',
          orderCount: { $sum: 1 },
          totalDiscount: { $sum: '$voucherDiscount' },
          totalRevenue: { $sum: '$total' },
        },
      },
      { $sort: { totalDiscount: -1 } },
    ]);
    const totalVoucherDiscount = voucherPerformance.reduce((sum, v) => sum + v.totalDiscount, 0);

    const promotions = await Promotion.find().sort({ startDate: -1 });
    const promotionsWithCoverage = await Promise.all(
      promotions.map(async (p) => {
        const status = !p.isVisible
          ? 'nonaktif'
          : now < p.startDate
          ? 'terjadwal'
          : now > p.endDate
          ? 'berakhir'
          : 'aktif';
        const productCount =
          p.type === 'products'
            ? p.productIds.length
            : await Product.countDocuments({ category: p.categoryId });
        return {
          id: p._id.toString(),
          name: p.name,
          type: p.type,
          discountPercent: p.discountPercent,
          startDate: p.startDate,
          endDate: p.endDate,
          status,
          productCount,
        };
      })
    );

    res.json({
      vouchers: vouchers.map((v) => ({
        id: v._id.toString(),
        code: v.code,
        name: v.name,
        discountType: v.discountType,
        discountValue: v.discountValue,
        usedCount: v.usedCount,
        usageLimit: v.usageLimit,
        status: voucherStatus(v),
      })),
      voucherPerformance: voucherPerformance.map((v) => ({
        code: v._id,
        orderCount: v.orderCount,
        totalDiscount: v.totalDiscount,
        totalRevenue: v.totalRevenue,
      })),
      totalVoucherDiscount,
      promotions: promotionsWithCoverage,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 3: Verify against the running dev server**

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@kumakuma.com","password":"admin123"}'
$token = $login.token
Invoke-RestMethod -Uri "http://localhost:5000/api/reports/promotions?range=30d" -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 5
```

Expected: JSON with `vouchers`, `voucherPerformance`, `totalVoucherDiscount`, `promotions`.

- [ ] **Step 4: Commit**

```bash
git add routes/reportRoutes.js
git commit -m "feat: add promotion and voucher report endpoint"
```

---

### Task 5: Add frontend types for the new reports

**Files:**
- Modify: `client/src/types/ecommerce.ts`

- [ ] **Step 1: Extend `ReportsSummary` and add the new report interfaces**

Find (the existing `ReportsSummary` interface, currently the last thing in the file):

```ts
export interface ReportsSummary {
  totalRevenue: number;
  orderCount: number;
  trend: ReportsTrendPoint[];
  paymentStatusCounts: Record<string, number>;
  orderStatusCounts: Record<string, number>;
  topProducts: ReportsTopProduct[];
}
```

Replace with:

```ts
export interface ReportsSummary {
  totalRevenue: number;
  orderCount: number;
  trend: ReportsTrendPoint[];
  paymentStatusCounts: Record<string, number>;
  orderStatusCounts: Record<string, number>;
  topProducts: ReportsTopProduct[];
  paymentTypeCounts: Record<string, number>;
  courierCounts: Record<string, number>;
  newCustomersCount: number;
}

export interface ProductRatingInfo {
  productId: string;
  name: string;
  image: string;
  ratingAvg: number;
  reviewCount: number;
}

export interface CategoryPerformance {
  categoryId: string | null;
  name: string;
  revenue: number;
  quantity: number;
}

export interface ProductsReport {
  topByRevenue: ReportsTopProduct[];
  topByQuantity: ReportsTopProduct[];
  unsoldProducts: ProductRatingInfo[];
  unsoldCount: number;
  topRated: ProductRatingInfo[];
  categoryPerformance: CategoryPerformance[];
}

export interface TopSpender {
  customerId: string;
  name: string;
  email: string;
  total: number;
  orderCount: number;
}

export interface CustomersReport {
  totalRegistered: number;
  newCustomers: number;
  suspendedCount: number;
  topSpenders: TopSpender[];
  newBuyers: number | null;
  returningBuyers: number | null;
}

export type VoucherStatus = 'aktif' | 'nonaktif' | 'terjadwal' | 'berakhir';

export interface VoucherReportRow {
  id: string;
  code: string;
  name: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  usedCount: number;
  usageLimit: number;
  status: VoucherStatus;
}

export interface VoucherPerformanceRow {
  code: string;
  orderCount: number;
  totalDiscount: number;
  totalRevenue: number;
}

export interface PromotionReportRow {
  id: string;
  name: string;
  type: 'products' | 'category';
  discountPercent: number;
  startDate: string;
  endDate: string;
  status: VoucherStatus;
  productCount: number;
}

export interface PromotionsReport {
  vouchers: VoucherReportRow[];
  voucherPerformance: VoucherPerformanceRow[];
  totalVoucherDiscount: number;
  promotions: PromotionReportRow[];
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors (no other file references the new types yet, so this just confirms the new interfaces themselves are syntactically valid).

- [ ] **Step 3: Commit**

```bash
git add client/src/types/ecommerce.ts
git commit -m "feat: add types for admin analytics reports"
```

---

### Task 6: Add API client methods

**Files:**
- Modify: `client/src/services/api.ts`

- [ ] **Step 1: Add the 3 new types to the existing ecommerce import**

Find:

```ts
import type { WishlistProduct, Review, ReviewsResponse, CanReviewResponse, MyReviewsResponse, SavedAddress, VoucherValidation, CreateOrderPayload, ReportsSummary, ReportsRange, ShippingSettings, ShippingRatesResponse } from '../types/ecommerce';
```

Replace with:

```ts
import type { WishlistProduct, Review, ReviewsResponse, CanReviewResponse, MyReviewsResponse, SavedAddress, VoucherValidation, CreateOrderPayload, ReportsSummary, ReportsRange, ShippingSettings, ShippingRatesResponse, ProductsReport, CustomersReport, PromotionsReport } from '../types/ecommerce';
```

- [ ] **Step 2: Add the 3 new API methods**

Find:

```ts
  getReportsSummary: async (range: ReportsRange): Promise<ReportsSummary> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/reports/summary?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat laporan');
    return res.json();
  },
```

Replace with:

```ts
  getReportsSummary: async (range: ReportsRange): Promise<ReportsSummary> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/reports/summary?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat laporan');
    return res.json();
  },

  getProductsReport: async (range: ReportsRange): Promise<ProductsReport> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/reports/products?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat laporan produk');
    return res.json();
  },

  getCustomersReport: async (range: ReportsRange): Promise<CustomersReport> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/reports/customers?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat laporan pelanggan');
    return res.json();
  },

  getPromotionsReport: async (range: ReportsRange): Promise<PromotionsReport> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/reports/promotions?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal memuat laporan promosi');
    return res.json();
  },
```

- [ ] **Step 3: Verify types compile**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/services/api.ts
git commit -m "feat: add api client methods for analytics reports"
```

---

### Task 7: Add data-fetching hooks

**Files:**
- Modify: `client/src/hooks/useApi.ts`

- [ ] **Step 1: Add the 3 new types to the existing ecommerce import**

Find:

```ts
import type { WishlistProduct, SavedAddress, VoucherValidation, ReportsSummary, ReportsRange, ShippingSettings, Order, CartItem, ItemDimensions, MyReviewsResponse } from '../types/ecommerce';
```

Replace with:

```ts
import type { WishlistProduct, SavedAddress, VoucherValidation, ReportsSummary, ReportsRange, ShippingSettings, Order, CartItem, ItemDimensions, MyReviewsResponse, ProductsReport, CustomersReport, PromotionsReport } from '../types/ecommerce';
```

- [ ] **Step 2: Add the 3 new hooks**

Find:

```ts
export function useReportsSummary(range: ReportsRange) {
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.getReportsSummary(range)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [range]);

  return { data, loading, error };
}
```

Replace with:

```ts
export function useReportsSummary(range: ReportsRange) {
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.getReportsSummary(range)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [range]);

  return { data, loading, error };
}

export function useProductsReport(range: ReportsRange) {
  const [data, setData] = useState<ProductsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.getProductsReport(range)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [range]);

  return { data, loading, error };
}

export function useCustomersReport(range: ReportsRange) {
  const [data, setData] = useState<CustomersReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.getCustomersReport(range)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [range]);

  return { data, loading, error };
}

export function usePromotionsReport(range: ReportsRange) {
  const [data, setData] = useState<PromotionsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.getPromotionsReport(range)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [range]);

  return { data, loading, error };
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useApi.ts
git commit -m "feat: add hooks for analytics report endpoints"
```

---

### Task 8: Create the Penjualan tab component

**Files:**
- Create: `client/src/pages/admin/laporan/PenjualanTab.tsx`

- [ ] **Step 1: Write the component**

This carries over everything the current `Laporan.tsx` already renders, plus AOV, cancellation rate, and the two new breakdown cards.

```tsx
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useReportsSummary } from '../../../hooks/useApi'
import type { ReportsRange } from '../../../types/ecommerce'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'

interface Props {
  range: ReportsRange
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const PAYMENT_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-700' },
  paid:     { label: 'Lunas',    color: 'bg-green-100 text-green-700' },
  failed:   { label: 'Gagal',    color: 'bg-red-100 text-red-700' },
  expired:  { label: 'Expired',  color: 'bg-gray-100 text-gray-600' },
  refunded: { label: 'Refund',   color: 'bg-purple-100 text-purple-700' },
}

const ORDER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Menunggu Bayar', color: 'bg-yellow-100 text-yellow-700' },
  processing:       { label: 'Diproses',       color: 'bg-blue-100 text-blue-700' },
  shipped:          { label: 'Dikirim',        color: 'bg-indigo-100 text-indigo-700' },
  delivered:        { label: 'Selesai',        color: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Dibatalkan',     color: 'bg-red-100 text-red-700' },
}

const chartConfig = {
  revenue: { label: 'Pendapatan', color: 'var(--color-primary)' },
} satisfies ChartConfig

function renderCountBadges(
  counts: Record<string, number>,
  labelMap: Record<string, { label: string; color: string }>
) {
  const entries = Object.entries(counts)
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada data</p>
  }
  return entries.map(([key, count]) => {
    const s = labelMap[key] ?? { label: key || 'Tidak diketahui', color: 'bg-gray-100 text-gray-600' }
    return (
      <span key={key} className={`px-3 py-1.5 rounded-full text-xs font-medium ${s.color}`}>
        {s.label}: {count}
      </span>
    )
  })
}

export default function PenjualanTab({ range }: Props) {
  const { data, loading, error } = useReportsSummary(range)

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  const aov = data && data.orderCount > 0 ? data.totalRevenue / data.orderCount : 0
  const totalOrdersInRange = Object.values(data?.orderStatusCounts ?? {}).reduce((a, b) => a + b, 0)
  const cancelledOrRefunded =
    (data?.orderStatusCounts?.cancelled ?? 0) + (data?.paymentStatusCounts?.refunded ?? 0)
  const cancellationRate = totalOrdersInRange > 0 ? (cancelledOrRefunded / totalOrdersInRange) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{fmt(data?.totalRevenue ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{data?.orderCount ?? 0} pesanan lunas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata Nilai Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{fmt(aov)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">per pesanan lunas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tingkat Pembatalan/Refund</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{cancellationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">{cancelledOrRefunded} dari {totalOrdersInRange} pesanan</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tren Pendapatan</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.trend.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={data.trend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data pendapatan di periode ini</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Status Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {renderCountBadges(data?.paymentStatusCounts ?? {}, PAYMENT_STATUS_LABEL)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {renderCountBadges(data?.orderStatusCounts ?? {}, ORDER_STATUS_LABEL)}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {renderCountBadges(data?.paymentTypeCounts ?? {}, {})}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kurir Terpopuler</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {renderCountBadges(data?.courierCounts ?? {}, {})}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produk Terlaris</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.topProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Qty Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topProducts.map((p) => (
                  <TableRow key={p.productId || p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada produk terjual di periode ini</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

Note: `renderCountBadges(data?.paymentTypeCounts ?? {}, {})` passes an empty label map on purpose — payment type / courier names from Midtrans/Biteship are already human-readable strings (e.g. `gopay`, `JNE`), so the helper's fallback branch (`labelMap[key] ?? { label: key, color: 'bg-gray-100 text-gray-600' }`) is used for every entry, giving all of them the same neutral gray pill.

- [ ] **Step 2: Verify it compiles and lints**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors (the file isn't imported anywhere yet, but both commands check all files under `src/`, not just reachable ones).

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/laporan/PenjualanTab.tsx
git commit -m "feat: add Penjualan tab component for laporan page"
```

---

### Task 9: Create the Produk tab component

**Files:**
- Create: `client/src/pages/admin/laporan/ProdukTab.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState } from 'react'
import { Star } from 'lucide-react'
import { useProductsReport } from '../../../hooks/useApi'
import type { ReportsRange } from '../../../types/ecommerce'
import api from '../../../services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface Props {
  range: ReportsRange
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function ProdukTab({ range }: Props) {
  const { data, loading, error } = useProductsReport(range)
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity'>('revenue')

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  const topProducts = sortBy === 'revenue' ? data?.topByRevenue ?? [] : data?.topByQuantity ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Produk Terlaris</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={sortBy === 'revenue' ? 'default' : 'outline'}
              onClick={() => setSortBy('revenue')}
            >
              By Revenue
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'quantity' ? 'default' : 'outline'}
              onClick={() => setSortBy('quantity')}
            >
              By Qty
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Qty Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p) => (
                  <TableRow key={p.productId || p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada produk terjual di periode ini</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produk Tidak Terjual</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.unsoldProducts.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">{data.unsoldCount} produk tanpa penjualan di periode ini</p>
              <div className="space-y-2">
                {data.unsoldProducts.map((p) => (
                  <div key={p.productId} className="flex items-center gap-3">
                    <div className="size-10 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img
                        src={api.getImageUrl(p.image)}
                        alt={p.name}
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40'
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Semua produk terjual di periode ini</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rating &amp; Ulasan per Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Sepanjang waktu, tidak mengikuti filter rentang</p>
          {data && data.topRated.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="text-right">Jumlah Ulasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topRated.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                        {p.ratingAvg.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{p.reviewCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada ulasan produk</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performa per Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.categoryPerformance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Qty Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.categoryPerformance.map((c) => (
                  <TableRow key={c.categoryId ?? 'none'}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{c.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(c.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data kategori di periode ini</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles and lints**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/laporan/ProdukTab.tsx
git commit -m "feat: add Produk tab component for laporan page"
```

---

### Task 10: Create the Pelanggan tab component

**Files:**
- Create: `client/src/pages/admin/laporan/PelangganTab.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useCustomersReport } from '../../../hooks/useApi'
import type { ReportsRange } from '../../../types/ecommerce'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface Props {
  range: ReportsRange
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function PelangganTab({ range }: Props) {
  const { data, loading, error } = useCustomersReport(range)

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pelanggan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data?.totalRegistered ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Sepanjang waktu</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pelanggan Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data?.newCustomers ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Periode ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Baru vs Berulang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {data?.newBuyers === null ? 'N/A' : `${data?.newBuyers ?? 0} / ${data?.returningBuyers ?? 0}`}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.newBuyers === null ? 'Tidak berlaku untuk "Semua"' : 'Pembeli baru / berulang'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pelanggan Disuspend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data?.suspendedCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Sepanjang waktu</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Pelanggan</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.topSpenders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Jumlah Order</TableHead>
                  <TableHead className="text-right">Total Belanja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topSpenders.map((s) => (
                  <TableRow key={s.customerId}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell className="text-right">{s.orderCount}</TableCell>
                    <TableCell className="text-right">{fmt(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada pelanggan dengan pesanan lunas di periode ini</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles and lints**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/laporan/PelangganTab.tsx
git commit -m "feat: add Pelanggan tab component for laporan page"
```

---

### Task 11: Create the Promosi & Voucher tab component

**Files:**
- Create: `client/src/pages/admin/laporan/PromosiTab.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { usePromotionsReport } from '../../../hooks/useApi'
import type { ReportsRange, VoucherStatus } from '../../../types/ecommerce'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface Props {
  range: ReportsRange
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const STATUS_LABEL: Record<VoucherStatus, { label: string; color: string }> = {
  aktif:     { label: 'Aktif',     color: 'bg-green-100 text-green-700' },
  nonaktif:  { label: 'Nonaktif',  color: 'bg-gray-100 text-gray-600' },
  terjadwal: { label: 'Terjadwal', color: 'bg-blue-100 text-blue-700' },
  berakhir:  { label: 'Berakhir',  color: 'bg-red-100 text-red-700' },
}

function StatusBadge({ status }: { status: VoucherStatus }) {
  const s = STATUS_LABEL[status]
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
}

export default function PromosiTab({ range }: Props) {
  const { data, loading, error } = usePromotionsReport(range)

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Diskon Voucher Diberikan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{fmt(data?.totalVoucherDiscount ?? 0)}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Periode ini, semua pelanggan</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Voucher</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.vouchers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Pemakaian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.vouchers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.code}</TableCell>
                    <TableCell>{v.name}</TableCell>
                    <TableCell><StatusBadge status={v.status} /></TableCell>
                    <TableCell className="text-right">
                      {v.usedCount}{v.usageLimit > 0 ? ` / ${v.usageLimit}` : ' (tanpa batas)'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada voucher</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performa Voucher</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.voucherPerformance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead className="text-right">Jumlah Order</TableHead>
                  <TableHead className="text-right">Diskon Diberikan</TableHead>
                  <TableHead className="text-right">Revenue Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.voucherPerformance.map((v) => (
                  <TableRow key={v.code}>
                    <TableCell className="font-medium">{v.code}</TableCell>
                    <TableCell className="text-right">{v.orderCount}</TableCell>
                    <TableCell className="text-right">{fmt(v.totalDiscount)}</TableCell>
                    <TableCell className="text-right">{fmt(v.totalRevenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada voucher dipakai di periode ini</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Promosi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Dampak revenue promosi belum bisa diukur akurat — Order tidak menyimpan promosi mana yang berlaku saat checkout.
          </p>
          {data && data.promotions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Diskon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cakupan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.promotions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.type === 'products' ? 'Produk' : 'Kategori'}</TableCell>
                    <TableCell className="text-right">{p.discountPercent}%</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">{p.productCount} produk</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada promosi</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles and lints**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/laporan/PromosiTab.tsx
git commit -m "feat: add Promosi tab component for laporan page"
```

---

### Task 12: Convert Laporan.tsx into the tabbed shell

**Files:**
- Modify: `client/src/pages/admin/Laporan.tsx`

- [ ] **Step 1: Replace the entire file**

The current single-tab page becomes a thin shell. Replace the full contents of `client/src/pages/admin/Laporan.tsx` with:

```tsx
import { useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import type { ReportsRange } from '../../types/ecommerce'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import PenjualanTab from './laporan/PenjualanTab'
import ProdukTab from './laporan/ProdukTab'
import PelangganTab from './laporan/PelangganTab'
import PromosiTab from './laporan/PromosiTab'

const RANGE_OPTIONS: { value: ReportsRange; label: string }[] = [
  { value: '7d', label: '7 Hari Terakhir' },
  { value: '30d', label: '30 Hari Terakhir' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'year', label: 'Tahun Ini' },
  { value: 'all', label: 'Semua' },
]

export default function Laporan() {
  const [range, setRange] = useState<ReportsRange>('30d')

  return (
    <AdminLayout title="Laporan">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">Ringkasan penjualan, produk, pelanggan, dan promosi.</p>
        <Select value={range} onValueChange={(v) => setRange(v as ReportsRange)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="penjualan">
        <TabsList>
          <TabsTrigger value="penjualan">Penjualan</TabsTrigger>
          <TabsTrigger value="produk">Produk</TabsTrigger>
          <TabsTrigger value="pelanggan">Pelanggan</TabsTrigger>
          <TabsTrigger value="promosi">Promosi & Voucher</TabsTrigger>
        </TabsList>
        <TabsContent value="penjualan" className="mt-4">
          <PenjualanTab range={range} />
        </TabsContent>
        <TabsContent value="produk" className="mt-4">
          <ProdukTab range={range} />
        </TabsContent>
        <TabsContent value="pelanggan" className="mt-4">
          <PelangganTab range={range} />
        </TabsContent>
        <TabsContent value="promosi" className="mt-4">
          <PromosiTab range={range} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  )
}
```

- [ ] **Step 2: Verify it compiles and lints**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Manual browser verification**

With `npm run dev` running (project root), open `http://localhost:5173/admin/laporan` and log in as admin if prompted.

Check:
- All 4 tabs ("Penjualan", "Produk", "Pelanggan", "Promosi & Voucher") render and are clickable
- Changing the range dropdown (e.g. 30 Hari → Semua) updates the data in whichever tab is currently open
- Switching tabs shows a brief loading skeleton the first time each tab is opened, then renders its content (or an empty-state message if there's no data yet — that's expected on a fresh dev DB)
- Open the browser console (F12) and confirm there are no red errors while clicking through all 4 tabs and changing the range

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/Laporan.tsx
git commit -m "feat: convert laporan page into tabbed analytics dashboard"
```

---

### Task 13: Add AOV and new-customer cards to the Dashboard home

**Files:**
- Modify: `client/src/pages/admin/Dashboard.tsx`

- [ ] **Step 1: Add the two new icons to the lucide-react import**

Find:

```tsx
import { Package, Tags, Star, Wallet, Newspaper, Mail, PencilLine, ExternalLink } from 'lucide-react'
```

Replace with:

```tsx
import { Package, Tags, Star, Wallet, Newspaper, Mail, PencilLine, ExternalLink, Calculator, UserPlus } from 'lucide-react'
```

- [ ] **Step 2: Add the two new stat cards**

Find:

```tsx
    {
      label: 'Total Pendapatan',
      value: fmt(reports?.totalRevenue ?? 0),
      icon: Wallet,
      description: '30 hari terakhir',
      path: '/admin/laporan',
    },
  ]
```

Replace with:

```tsx
    {
      label: 'Total Pendapatan',
      value: fmt(reports?.totalRevenue ?? 0),
      icon: Wallet,
      description: '30 hari terakhir',
      path: '/admin/laporan',
    },
    {
      label: 'Rata-rata Nilai Order',
      value: fmt(reports?.orderCount ? reports.totalRevenue / reports.orderCount : 0),
      icon: Calculator,
      description: '30 hari terakhir',
      path: '/admin/laporan',
    },
    {
      label: 'Pelanggan Baru',
      value: reports?.newCustomersCount ?? 0,
      icon: UserPlus,
      description: '30 hari terakhir',
      path: '/admin/laporan',
    },
  ]
```

- [ ] **Step 3: Verify it compiles and lints**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Manual browser verification**

With `npm run dev` running, open `http://localhost:5173/admin` and log in as admin if prompted.

Check:
- The stat grid now shows 6 cards (Total Produk, Kategori, Featured, Total Pendapatan, Rata-rata Nilai Order, Pelanggan Baru) and wraps cleanly into two rows on desktop width
- "Rata-rata Nilai Order" and "Pelanggan Baru" are both clickable and navigate to `/admin/laporan`
- No layout overflow/breakage at common widths (resize the browser or check mobile width too, since the grid is `grid-cols-2 lg:grid-cols-4`)

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/admin/Dashboard.tsx
git commit -m "feat: add AOV and new customer cards to admin dashboard"
```

---

### Task 14: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full pre-commit check from CLAUDE.md**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: both pass with zero errors across the whole `client/` project, not just the files touched in this plan.

- [ ] **Step 2: Full manual walkthrough**

With `npm run dev` running, as admin:

1. Open `/admin` — confirm all 6 stat cards render with plausible values (zeros are fine on a sparse dev DB)
2. Open `/admin/laporan` — for each of the 4 tabs, and for at least 2 different range values (e.g. `30 Hari Terakhir` and `Semua`):
   - Penjualan: revenue, AOV, cancellation rate, trend chart, payment/courier breakdowns, top products
   - Produk: top products toggle (By Revenue / By Qty) changes the table order, unsold products list, rating table (note it does NOT change when you switch range — by design), category performance
   - Pelanggan: 4 stat cards, "Baru vs Berulang" shows `N/A` specifically when range = `Semua`, top spenders table
   - Promosi & Voucher: voucher list + status badges, voucher performance table, total discount card, promotions list with the data-limitation caption visible
3. Confirm no browser console errors throughout

- [ ] **Step 3: Report results**

If everything above checks out, the feature is complete — no commit needed for this task (verification only). If anything fails, fix it in the relevant task's file and re-run that task's verification before continuing.
