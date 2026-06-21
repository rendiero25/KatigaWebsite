# Admin Dashboard Analytics — Perluasan Laporan

**Date:** 2026-06-19
**Scope:** 3 endpoint laporan baru + perluasan `/api/reports/summary`, halaman `Laporan` jadi 4 tab, 2 kartu highlight baru di Dashboard home. User dashboard (`/profil`) sengaja tidak disentuh — sesi terpisah.

## Problem

Admin dashboard (`/admin`) dan halaman Laporan (`/admin/laporan`) hanya menampilkan data penjualan dasar (revenue, tren, status, top 5 produk). Data yang sudah tersimpan di database — review/rating produk, profil & perilaku pelanggan, pemakaian voucher, cakupan promosi — tidak pernah diagregasi atau ditampilkan ke admin, padahal semuanya relevan untuk keputusan bisnis (produk mana yang harus di-restock/diturunkan, pelanggan mana yang loyal, voucher mana yang efektif).

## Solution

Halaman `Laporan` dipecah jadi 4 tab. Range selector (7d/30d/month/year/all yang sudah ada) tetap satu, di level halaman, berlaku ke semua tab — kecuali metrik yang secara definisi lifetime (ditandai eksplisit di UI, tidak diam-diam mengabaikan dropdown).

| Tab | Status | Endpoint |
|---|---|---|
| Penjualan | Sudah ada, diperluas | `GET /api/reports/summary` (existing, +3 field) |
| Produk | Baru | `GET /api/reports/products` |
| Pelanggan | Baru | `GET /api/reports/customers` |
| Promosi & Voucher | Baru | `GET /api/reports/promotions` |

Dashboard home (`/admin`) tetap ringkas: tambah 2 kartu (AOV, Pelanggan Baru) yang keduanya bersumber dari `/summary` yang sudah dipanggil di sana — tidak ada query tambahan di Dashboard.

**Keputusan penting:** Promosi (diskon % per produk/kategori) **tidak** punya jejak di `Order` — tidak ada field yang mencatat promosi mana yang berlaku saat checkout. Tab Promosi hanya menampilkan status & cakupan promosi, **tanpa klaim revenue/dampak penjualan**. Voucher berbeda — `Order.voucherCode` + `Order.voucherDiscount` tersimpan langsung, jadi ROI voucher dihitung akurat.

### Tab Penjualan (perluasan)

Semua yang sudah ada (revenue, tren, status pembayaran/pesanan, top 5 produk) tetap. Tambahan:

| Metrik | Sumber | Catatan |
|---|---|---|
| Rata-rata Nilai Order (AOV) | `totalRevenue ÷ orderCount` | Murni kalkulasi frontend, tidak ada field baru |
| Tingkat Pembatalan/Refund | `(orderStatusCounts.cancelled + paymentStatusCounts.refunded) ÷ total × 100%` | Murni kalkulasi frontend dari data yang sudah ada |
| Metode Pembayaran | Facet baru: group by `midtransPaymentType`, match `paid` + dateFilter | |
| Kurir Terpopuler | Facet baru: group by `shippingServiceName`, match `paid` + dateFilter | |

### Tab Produk (baru)

| Metrik | Sumber |
|---|---|
| Produk Terlaris — by Revenue & by Qty (toggle) | 2 facet terpisah (masing-masing limit 10), dalam rentang |
| Produk Tidak Terjual | Produk yang ID-nya tidak muncul di `Order.items` dalam rentang |
| Rating & Jumlah Ulasan per Produk | Langsung dari `Product.ratingAvg` + `Product.reviewCount` — **lifetime**, tidak ikut filter rentang |
| Performa per Kategori | `$lookup` items→Product→category, group by kategori, sum revenue+qty, dalam rentang |

### Tab Pelanggan (baru)

| Metrik | Sumber | Rentang? |
|---|---|---|
| Total Pelanggan Terdaftar | `Customer.countDocuments()` | Lifetime |
| Pelanggan Baru | `Customer.createdAt` dalam rentang | Ikut rentang |
| Baru vs Berulang (pembeli) | Dari pelanggan yang order lunas di rentang ini: sudah pernah order lunas sebelum awal rentang? | Ikut rentang. **N/A saat range=`all`** (tidak ada "sebelum" untuk dibandingkan) |
| Top Pelanggan (by belanja) | Group Order by customer (lunas), sum total, top 10 + lookup nama/email | Ikut rentang |
| Pelanggan Disuspend | `Customer.suspended: true` count | Lifetime |

### Tab Promosi & Voucher (baru)

| Metrik | Sumber |
|---|---|
| Daftar voucher + status (Aktif/Nonaktif/Berakhir) | `Voucher` collection, status dihitung dari `startDate`/`endDate`/`isActive` saat response (real `Date.now()`, bukan workflow script) |
| Pemakaian per voucher | `usedCount ÷ usageLimit` (0 = tanpa batas) |
| Performa per voucher | Group Order by `voucherCode` (lunas, ≠ '', dalam rentang): jumlah order, total `voucherDiscount`, total revenue |
| Total Diskon Voucher Diberikan | Sum semua `voucherDiscount` di atas |
| Daftar promosi + status (Aktif/Terjadwal/Berakhir) | `Promotion` collection, status dari tanggal + `isVisible` |
| Cakupan promosi | `productIds.length` (type `products`) atau `Product.countDocuments({category: categoryId})` (type `category`) |
| ~~Revenue/dampak promosi~~ | **Tidak ditampilkan** — caption kecil menjelaskan keterbatasan data |

### Dashboard home — 2 kartu baru

1. **Rata-rata Nilai Order (AOV)** — derived, no new query
2. **Pelanggan Baru (30 hari)** — field baru `newCustomersCount` di `/summary`

Keduanya clickable → lompat ke tab terkait di `/admin/laporan` (pola yang sama seperti card "Total Pendapatan" sekarang).

## Backend

### `routes/reportRoutes.js` — perluasan + 3 route baru

`getDateFilter(range)` dan `toCountRecord(rows)` yang sudah ada dipakai ulang di semua endpoint baru (tidak diduplikasi).

**`GET /api/reports/summary`** (existing, tambah 3 field di response + 2 facet + 1 query terpisah):

```js
// tambahan facet di $facet block yang sudah ada:
paymentTypeCounts: [
  { $match: { paymentStatus: 'paid', ...dateFilter } },
  { $group: { _id: '$midtransPaymentType', count: { $sum: 1 } } },
],
courierCounts: [
  { $match: { paymentStatus: 'paid', ...dateFilter } },
  { $group: { _id: '$shippingServiceName', count: { $sum: 1 } } },
],
```

```js
// query terpisah (collection berbeda, tidak bisa masuk $facet Order):
const newCustomersCount = await Customer.countDocuments(
  dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}
);
```

Response shape baru (3 field tambahan, sisanya tidak berubah):
```ts
{
  // ...field existing...
  paymentTypeCounts: Record<string, number>;
  courierCounts: Record<string, number>;
  newCustomersCount: number;
}
```

**`GET /api/reports/products?range=`** (baru):

```js
const [result] = await Order.aggregate([
  { $facet: {
      topByRevenue: [
        { $match: { paymentStatus: 'paid', ...dateFilter } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', name: { $first: '$items.name' },
                     revenue: { $sum: '$items.subtotal' }, quantity: { $sum: '$items.quantity' } } },
        { $sort: { revenue: -1 } }, { $limit: 10 },
      ],
      topByQuantity: [
        { $match: { paymentStatus: 'paid', ...dateFilter } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', name: { $first: '$items.name' },
                     revenue: { $sum: '$items.subtotal' }, quantity: { $sum: '$items.quantity' } } },
        { $sort: { quantity: -1 } }, { $limit: 10 },
      ],
      soldProductIds: [
        { $match: { paymentStatus: 'paid', ...dateFilter } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product' } },
      ],
      categoryPerformance: [
        { $match: { paymentStatus: 'paid', ...dateFilter } },
        { $unwind: '$items' },
        { $lookup: { from: Product.collection.name, localField: 'items.product', foreignField: '_id', as: 'p' } },
        { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$p.category', revenue: { $sum: '$items.subtotal' }, quantity: { $sum: '$items.quantity' } } },
        { $lookup: { from: ProductCategory.collection.name, localField: '_id', foreignField: '_id', as: 'c' } },
        { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
        { $project: { categoryId: '$_id', name: { $ifNull: ['$c.name', 'Tanpa Kategori'] }, revenue: 1, quantity: 1 } },
        { $sort: { revenue: -1 } },
      ],
  } },
]);

const soldIds = result.soldProductIds.map(r => r._id);
const unsoldProducts = await Product.find({ _id: { $nin: soldIds } })
  .select('name image ratingAvg reviewCount').limit(10);
const unsoldCount = await Product.countDocuments({ _id: { $nin: soldIds } });

const topRated = await Product.find().sort({ reviewCount: -1 })
  .select('name image ratingAvg reviewCount').limit(10);
```

**Catatan implementasi:** gunakan `Product.collection.name` / `ProductCategory.collection.name` (bukan string literal `'products'`/`'productcategories'`) di `$lookup.from` supaya tidak bergantung pada asumsi pluralization Mongoose.

Response shape:
```ts
{
  topByRevenue: { productId: string; name: string; revenue: number; quantity: number }[];
  topByQuantity: { productId: string; name: string; revenue: number; quantity: number }[];
  unsoldProducts: { productId: string; name: string; image: string; ratingAvg: number; reviewCount: number }[];
  unsoldCount: number;
  topRated: { productId: string; name: string; image: string; ratingAvg: number; reviewCount: number }[]; // lifetime, label di UI
  categoryPerformance: { categoryId: string | null; name: string; revenue: number; quantity: number }[];
}
```

**`GET /api/reports/customers?range=`** (baru):

```js
const totalRegistered = await Customer.countDocuments();
const newCustomers = await Customer.countDocuments(
  dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}
);
const suspendedCount = await Customer.countDocuments({ suspended: true });

// catatan: pipeline ini TIDAK dibungkus $facet, jadi hasilnya array baris langsung — jangan didestructure jadi [x]
const topSpenders = await Order.aggregate([
  { $match: { paymentStatus: 'paid', ...dateFilter } },
  { $group: { _id: '$customer', total: { $sum: '$total' }, orderCount: { $sum: 1 } } },
  { $sort: { total: -1 } }, { $limit: 10 },
  { $lookup: { from: Customer.collection.name, localField: '_id', foreignField: '_id', as: 'c' } },
  { $unwind: '$c' },
  { $project: { customerId: '$_id', name: '$c.name', email: '$c.email', total: 1, orderCount: 1 } },
]);

// Baru vs berulang — N/A saat range === 'all'
let newBuyers = null, returningBuyers = null;
const rangeStart = dateFilter.createdAt?.$gte;
if (rangeStart) {
  const inRangeCustomerIds = await Order.distinct('customer', { paymentStatus: 'paid', ...dateFilter });
  const returningIds = await Order.distinct('customer', {
    paymentStatus: 'paid', customer: { $in: inRangeCustomerIds }, createdAt: { $lt: rangeStart },
  });
  returningBuyers = returningIds.length;
  newBuyers = inRangeCustomerIds.length - returningIds.length;
}
```

Response shape:
```ts
{
  totalRegistered: number;       // lifetime
  newCustomers: number;          // ikut rentang
  suspendedCount: number;        // lifetime
  topSpenders: { customerId: string; name: string; email: string; total: number; orderCount: number }[];
  newBuyers: number | null;      // null saat range === 'all'
  returningBuyers: number | null;
}
```

**`GET /api/reports/promotions?range=`** (baru):

```js
const now = new Date();
const vouchers = await Voucher.find().sort({ createdAt: -1 });
// status per voucher dihitung di response mapping: !isActive -> 'nonaktif',
// now < startDate -> 'terjadwal', now > endDate -> 'berakhir', else -> 'aktif'

// catatan: pipeline ini juga TIDAK dibungkus $facet — array baris langsung, bukan [x]
const voucherPerformance = await Order.aggregate([
  { $match: { paymentStatus: 'paid', voucherCode: { $ne: '' }, ...dateFilter } },
  { $group: { _id: '$voucherCode', orderCount: { $sum: 1 },
               totalDiscount: { $sum: '$voucherDiscount' }, totalRevenue: { $sum: '$total' } } },
  { $sort: { totalDiscount: -1 } },
]);
const totalVoucherDiscount = voucherPerformance.reduce((sum, v) => sum + v.totalDiscount, 0);

const promotions = await Promotion.find().sort({ startDate: -1 });
const promotionsWithCoverage = await Promise.all(promotions.map(async (p) => ({
  ...p.toObject(),
  status: !p.isVisible ? 'nonaktif' : now < p.startDate ? 'terjadwal' : now > p.endDate ? 'berakhir' : 'aktif',
  productCount: p.type === 'products'
    ? p.productIds.length
    : await Product.countDocuments({ category: p.categoryId }),
})));
```

Response shape:
```ts
{
  vouchers: { id: string; code: string; name: string; discountType: string; discountValue: number;
              usedCount: number; usageLimit: number; status: 'aktif'|'nonaktif'|'terjadwal'|'berakhir' }[];
  voucherPerformance: { code: string; orderCount: number; totalDiscount: number; totalRevenue: number }[];
  totalVoucherDiscount: number; // sum of voucherPerformance.totalDiscount
  promotions: { id: string; name: string; type: 'products'|'category'; discountPercent: number;
                startDate: string; endDate: string; status: string; productCount: number }[];
}
```

### `server.js`

Tidak ada perubahan — `/api/reports` sudah terdaftar.

## Frontend

### `client/src/types/ecommerce.ts`

Extend `ReportsSummary` dengan 3 field baru (`paymentTypeCounts`, `courierCounts`, `newCustomersCount`). Tambah 3 interface baru: `ProductsReport`, `CustomersReport`, `PromotionsReport` (sesuai response shape di atas).

### `client/src/services/api.ts`

Tambah 3 method baru mengikuti pola `getReportsSummary` yang sudah ada persis (Bearer token dari `localStorage`, base URL, `res.ok` check):
```ts
getProductsReport(range: ReportsRange): Promise<ProductsReport>
getCustomersReport(range: ReportsRange): Promise<CustomersReport>
getPromotionsReport(range: ReportsRange): Promise<PromotionsReport>
```

### `client/src/hooks/useApi.ts`

3 hook baru, masing-masing copy persis pola `useReportsSummary` (state `data`/`loading`/`error`, fetch on `range` change):
```ts
useProductsReport(range: ReportsRange)
useCustomersReport(range: ReportsRange)
usePromotionsReport(range: ReportsRange)
```

### `client/src/pages/admin/Laporan.tsx`

Bungkus konten yang sudah ada dengan shadcn `Tabs` (`client/src/components/ui/tabs.tsx` — **sudah terpasang, tidak perlu install**):
- Tab 1 "Penjualan" — konten existing + 2 stat card baru (AOV, tingkat pembatalan) + 2 card breakdown baru (metode pembayaran, kurir), reuse pola badge grid yang sudah ada untuk status
- Tab 2 "Produk" — toggle button/segmented (by Revenue / by Qty) di atas tabel top produk, card "Produk Tidak Terjual" (list + count), card rating (badge bintang + jumlah ulasan, label "Sepanjang waktu"), tabel performa kategori
- Tab 3 "Pelanggan" — 4 stat card (Total Terdaftar, Baru, Disuspend, + 1 baru vs berulang ditampilkan sebagai 2 angka berdampingan atau "N/A" saat range=all), tabel top 10 pelanggan
- Tab 4 "Promosi & Voucher" — tabel voucher (status badge + progress pemakaian), tabel performa voucher, card total diskon, tabel promosi (status badge + cakupan) + caption keterbatasan data

Range `Select` tetap satu di luar `Tabs`, di-share ke semua tab via state di komponen induk (masing-masing tab hanya fetch saat aktif — gunakan `value`/conditional render shadcn `Tabs` yang sudah lazy by default kalau dibungkus per-`TabsContent`).

Loading/error state per tab: ikuti convention yang sudah ada (`animate-pulse` skeleton, pesan error inline tanpa retry otomatis).

### `client/src/pages/admin/Dashboard.tsx`

Tambah 2 `StatCard` baru ke array `stats` yang sudah ada:
```ts
{
  label: 'Rata-rata Nilai Order',
  value: fmt(reports?.orderCount ? (reports.totalRevenue / reports.orderCount) : 0),
  icon: Calculator, // lucide-react
  description: '30 hari terakhir',
  path: '/admin/laporan',
},
{
  label: 'Pelanggan Baru',
  value: reports?.newCustomersCount ?? 0,
  icon: UserPlus, // lucide-react
  description: '30 hari terakhir',
  path: '/admin/laporan',
},
```

Tidak ada hook/query tambahan — keduanya derived dari `useReportsSummary('30d')` yang sudah dipanggil di file ini.

## Files Affected

| File | Change |
|---|---|
| `routes/reportRoutes.js` | Extend `/summary` (+3 field); add `/products`, `/customers`, `/promotions` |
| `client/src/types/ecommerce.ts` | Extend `ReportsSummary`; add `ProductsReport`, `CustomersReport`, `PromotionsReport` |
| `client/src/services/api.ts` | Add `getProductsReport`, `getCustomersReport`, `getPromotionsReport` |
| `client/src/hooks/useApi.ts` | Add `useProductsReport`, `useCustomersReport`, `usePromotionsReport` |
| `client/src/pages/admin/Laporan.tsx` | Wrap in `Tabs`; add 3 new tab panels; extend Penjualan tab |
| `client/src/pages/admin/Dashboard.tsx` | Add 2 stat cards (AOV, Pelanggan Baru) |

Tidak ada file baru di `routes/`, `models/`, atau `server.js` — semua perluasan dari resource yang sudah ada. Tidak ada shadcn component baru yang perlu di-install (`tabs`, `table`, `select`, `chart` semua sudah terpasang).

## Out of Scope

- **Stok/inventori** — tidak ada field stok di `Product`; ini butuh schema baru, bukan agregasi data existing
- **Page views / conversion rate** — butuh instrumentasi tracking baru, tidak ada sama sekali di codebase saat ini
- **CAC (customer acquisition cost)** — tidak ada data biaya marketing tersimpan
- **Atribusi revenue ke Promosi** — keputusan eksplisit: tampilkan status & cakupan saja (lihat bagian Solution)
- **Export laporan (PDF/Excel)** — tidak diminta, tidak masuk scope
- **Profit/margin** — tidak ada field cost-price (sudah out-of-scope di spec laporan sebelumnya, tetap berlaku)
- **Custom date range picker** — tetap preset dropdown (7d/30d/month/year/all), tidak ada date picker bebas
- **Period comparison** (misal bulan ini vs bulan lalu side-by-side) — tidak masuk scope
- **User dashboard (`/profil`)** — sengaja ditunda ke sesi terpisah
