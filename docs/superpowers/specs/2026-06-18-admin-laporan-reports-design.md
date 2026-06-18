# Laporan (Reports) Admin Dashboard

**Date:** 2026-06-18
**Scope:** New "Laporan" section in admin panel + revenue summary card on admin Dashboard home page

## Problem

Admin tidak punya visibilitas ke data penjualan/revenue. Dashboard home hanya menampilkan stat produk (Total Produk, Kategori, Featured) dan satu placeholder card ("Media") yang hardcoded ke 0. Tidak ada endpoint backend yang meng-agregasi data `Order` untuk reporting.

## Solution

Satu endpoint backend (`GET /api/reports/summary`) yang menghitung 4 metrik dari koleksi `Order` dalam satu aggregation pipeline (`$facet`), dikonsumsi oleh dua tempat:
1. Halaman admin baru `Laporan` — full detail + date range selector
2. Card baru di Dashboard home — `Total Pendapatan`, fixed 30 hari, menggantikan placeholder "Media"

### Metrics

| Metric | Source | Notes |
|---|---|---|
| Total Revenue | sum `Order.total`, `paymentStatus: 'paid'` | |
| Order Count | count of same match | konteks pendukung, bukan card terpisah |
| Revenue Trend | grouped by day (by month jika range `year`/`all`) | untuk line chart |
| Status Counts | grouped by `paymentStatus` dan `orderStatus` | TIDAK difilter `paymentStatus: paid` — tujuannya justru lihat breakdown semua status (pending/failed/refunded dll) |
| Top Products | `$unwind items`, group by product, sum `item.subtotal` sebagai revenue | top 5, sorted by revenue desc |

**Eksplisit di luar scope:** profit/margin (tidak ada field cost price di `Product`/`Order`), export CSV/PDF, permission per-admin (cuma single admin account).

## Backend

### `routes/reportRoutes.js` (baru)

`GET /api/reports/summary?range=7d|30d|month|year|all` — protected by `auth` middleware (sama seperti `orderRoutes.js`).

`range` menentukan filter `createdAt`:
- `7d` → 7 hari terakhir
- `30d` → 30 hari terakhir (default)
- `month` → sejak awal bulan berjalan
- `year` → sejak awal tahun berjalan
- `all` → tanpa filter tanggal

Satu aggregation pipeline pakai `$facet` supaya 4 metrik dihitung dalam 1 query (1 collection scan), bukan 4 query terpisah:

```js
Order.aggregate([
  { $facet: {
      revenue: [
        { $match: { paymentStatus: 'paid', ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ],
      trend: [
        { $match: { paymentStatus: 'paid', ...dateFilter } },
        { $group: { _id: { $dateToString: { format: trendFormat, date: '$createdAt' } }, revenue: { $sum: '$total' } } },
        { $sort: { _id: 1 } },
      ],
      paymentStatusCounts: [
        { $match: dateFilter },
        { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
      ],
      orderStatusCounts: [
        { $match: dateFilter },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      ],
      topProducts: [
        { $match: { paymentStatus: 'paid', ...dateFilter } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', name: { $first: '$items.name' }, revenue: { $sum: '$items.subtotal' }, quantity: { $sum: '$items.quantity' } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ],
  } },
])
```

`trendFormat` = `'%Y-%m-%d'` untuk range `7d`/`30d`/`month`, `'%Y-%m'` untuk `year`/`all` (biar jumlah titik chart masuk akal, bukan ratusan titik harian).

`dateFilter` = `{ createdAt: { $gte: <boundary> } }`, atau `{}` ketika `range=all`.

Response shape:
```ts
{
  totalRevenue: number;
  orderCount: number;
  trend: { date: string; revenue: number }[];
  paymentStatusCounts: Record<string, number>;
  orderStatusCounts: Record<string, number>;
  topProducts: { productId: string; name: string; revenue: number; quantity: number }[];
}
```

Empty-state handling: kalau tidak ada order sama sekali di range tsb, `$facet` branches tetap return array kosong / tidak ada dokumen — route harus normalize ke `totalRevenue: 0, orderCount: 0, trend: [], ...` daripada `undefined`, supaya frontend tidak perlu null-check berlapis.

### `server.js`

Tambah `app.use('/api/reports', require('./routes/reportRoutes'))`.

## Frontend

### New shadcn components

`table`, `select`, `chart`. `chart` akan install `recharts` sebagai dependency baru — flagged karena CLAUDE.md melarang install package baru tanpa konfirmasi; sudah dikonfirmasi user saat memilih opsi "Revenue trend over time (chart)" di brainstorming. Inget known issue (lihat memory `feedback_shadcn_paths`): CLI nulis ke `client/@/components/ui/`, harus dipindah manual ke `client/src/components/ui/` setelah tiap install.

### `client/src/services/api.ts`

```ts
getReportsSummary: async (range: string): Promise<ReportsSummary> => {
  const token = localStorage.getItem('adminToken');
  const res = await fetch(`${API_BASE_URL}/reports/summary?range=${range}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Gagal memuat laporan');
  return res.json();
}
```

Tambah `interface ReportsSummary` (sesuai response shape di atas), ditaruh di `api.ts` mengikuti convention type lokal yang sudah ada di file itu.

### `client/src/hooks/useApi.ts`

```ts
export function useReportsSummary(range: string) {
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getReportsSummary(range)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat laporan'))
      .finally(() => setLoading(false));
  }, [range]);

  return { data, loading, error };
}
```

### `client/src/pages/admin/Laporan.tsx` (baru)

- `Select` dropdown range: 7 Hari / 30 Hari / Bulan Ini / Tahun Ini / Semua (default 30 Hari)
- Card "Total Pendapatan" — format `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`, sama seperti `fmt` helper lokal yang sudah dipakai di `Orders.tsx`
- Line chart trend pakai shadcn `chart` (recharts) — x axis tanggal/bulan, y axis revenue
- Status breakdown — badge grid kecil, reuse warna dari `ORDER_STATUS_LABEL` (`Orders.tsx`) untuk konsistensi visual
- Table top 5 produk by revenue (shadcn `Table`) — kolom: nama produk, revenue, qty terjual
- Loading state: `animate-pulse` skeleton blocks (convention CLAUDE.md). Error state: pesan inline, tanpa retry otomatis.

### `client/src/components/AdminLayout.tsx`

Tambah ke group "Transaksi" (sibling `Pesanan`, line ~134-138):
```ts
{ path: '/admin/laporan', icon: BarChart3, label: 'Laporan' }
```
`BarChart3` dari `lucide-react`.

### `client/src/App.tsx`

Register route `/admin/laporan` → `Laporan`, mengikuti pola registrasi admin route yang sudah ada.

### `client/src/pages/admin/Dashboard.tsx`

Ganti card "Media" (hardcoded 0, line yang sama di stat grid) jadi card "Total Pendapatan" — panggil `useReportsSummary('30d')` (fixed, tanpa selector di Dashboard), card clickable (link) ke `/admin/laporan`.

## Files Affected

| File | Change |
|---|---|
| `routes/reportRoutes.js` | New — `/summary` aggregation endpoint |
| `server.js` | Register `/api/reports` route |
| `client/src/services/api.ts` | Add `getReportsSummary` + `ReportsSummary` type |
| `client/src/hooks/useApi.ts` | Add `useReportsSummary` |
| `client/src/components/AdminLayout.tsx` | Add Laporan nav item to Transaksi group |
| `client/src/App.tsx` | Register `/admin/laporan` route |
| `client/src/pages/admin/Laporan.tsx` | New — full report page |
| `client/src/pages/admin/Dashboard.tsx` | Replace Media card with Total Pendapatan card |
| `client/src/components/ui/table.tsx`, `select.tsx`, `chart.tsx` | New — shadcn installs |
| `client/package.json` | Add `recharts` dependency |

## Out of Scope

- Profit/margin (no cost-price field anywhere in schema)
- CSV/PDF export
- Per-admin permissions (single admin account)
- Custom date range picker (preset dropdown only)
- Period comparison (e.g. this month vs last month side-by-side)
