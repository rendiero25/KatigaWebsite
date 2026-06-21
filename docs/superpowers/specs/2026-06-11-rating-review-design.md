# Rating & Review System — Design Spec
Date: 2026-06-11

## Overview

Sistem rating dan ulasan untuk ecommerce KumaKuma. Customer yang sudah membeli dan menerima produk (`orderStatus = delivered`) dapat memberikan rating bintang, komentar teks, dan foto per order item. Review langsung publik; admin dapat menyembunyikan atau menghapus. Stats (rata-rata bintang, jumlah ulasan) di-cache pada Product untuk performa baca yang cepat.

---

## 1. Data Model

### Model Baru: `Review`

```js
{
  product:    { type: ObjectId, ref: 'Product', required: true },
  customer:   { type: ObjectId, ref: 'Customer', required: true },
  order:      { type: ObjectId, ref: 'Order', required: true },
  rating:     { type: Number, min: 1, max: 5, required: true },
  comment:    { type: String, default: '', maxlength: 1000 },
  photos:     { type: [String], default: [] },  // max 5 Cloudinary URLs
  isVisible:  { type: Boolean, default: true },
  createdAt, updatedAt
}
```

**Unique index**: `{ customer, order, product }` — satu review per customer per order per produk.

### Update `Product` Schema

Tambah dua field cached:
```js
ratingAvg:   { type: Number, default: 0 },
reviewCount: { type: Number, default: 0 },
```

### `recalcProductStats(productId)` Helper

Fungsi shared dipanggil setiap kali review di-submit, di-toggle visibility, atau di-delete. Hanya menghitung review dengan `isVisible: true`:

```js
const stats = await Review.aggregate([
  { $match: { product: productId, isVisible: true } },
  { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
]);
await Product.findByIdAndUpdate(productId, {
  ratingAvg: parseFloat((stats[0]?.avg || 0).toFixed(1)),
  reviewCount: stats[0]?.count || 0,
});
```

---

## 2. Backend API

### Customer Routes — `routes/reviewRoutes.js`

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/reviews` | customerAuth | Submit review baru |
| `GET` | `/api/reviews/product/:productId` | public | List review visible, paginated |
| `GET` | `/api/reviews/can-review` | customerAuth | Cek boleh review `?productId=&orderId=` |

**POST `/api/reviews` logic:**
1. Cari Order: `{ _id: orderId, customer: req.customer._id, orderStatus: 'delivered' }` yang items-nya mengandung `product: productId`
2. Cek tidak ada Review existing `{ customer, order, product }`
3. Upload foto ke Cloudinary (max 5, via `upload.array('photos', 5)`)
4. Simpan Review
5. Panggil `recalcProductStats(productId)`
6. Return Review yang baru dibuat

**GET `/api/reviews/product/:productId`:**
- Query: `{ product: productId, isVisible: true }`
- Populate `customer` dengan field `name, avatar`
- Paginate: default 10 per page, sort by `createdAt: -1`
- Return: `{ reviews, total, page, pages, ratingAvg, ratingDistribution }`

**GET `/api/reviews/can-review`:**
- Cek Order delivered + contains product
- Cek belum ada Review untuk kombinasi itu
- Return: `{ canReview: boolean, alreadyReviewed: boolean }`

### Admin Routes — `routes/adminReviewRoutes.js`

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/admin/reviews` | adminAuth | List semua review, filter + paginate |
| `PATCH` | `/api/admin/reviews/:id/visibility` | adminAuth | Toggle `isVisible` |
| `DELETE` | `/api/admin/reviews/:id` | adminAuth | Hapus permanen |

**GET `/api/admin/reviews` query params:**
- `search` — cari by nama produk atau nama customer (lookup)
- `rating` — filter 1–5
- `isVisible` — `true` / `false` / semua
- `page`, `limit` (default 20)

**PATCH visibility:** Toggle `isVisible`, lalu `recalcProductStats`.

**DELETE:** Hapus Review, lalu `recalcProductStats`.

---

## 3. Frontend

### 3a. Product Card

**Lokasi**: `client/src/pages/Products.tsx` dan `client/src/components/ProductsSection.tsx`

Tambah di bawah nama produk:
- Bintang kecil (`size-3.5`) filled sesuai `product.ratingAvg`
- Teks `(N ulasan)` — jika `reviewCount = 0` tampilkan bintang abu-abu + "Belum ada ulasan"
- Data sudah ada di response produk — tidak ada API call tambahan

### 3b. Halaman Detail Produk (`/produk/:id`)

**Header produk** (baris bintang yang sudah ada):
- Replace hardcoded `0 ulasan` dengan `product.ratingAvg` dan `product.reviewCount`
- Bintang filled sesuai average

**Seksi "Ulasan Pembeli"** (sudah ada placeholder):
- **Summary bar**: angka rata-rata besar + distribusi bintang 5→1 (progress bar per bintang)
- **Review list**: `ReviewCard` per review — avatar, nama customer, bintang, komentar, foto thumbnail (click to enlarge), tanggal
- **Pagination**: tombol "Muat lebih banyak" (append ke list)
- Kalau `reviewCount = 0`: tampilkan empty state yang ada

### 3c. Halaman Detail Pesanan (`/pesanan/:id`)

Untuk pesanan dengan `orderStatus = delivered`, setiap order item mendapat:
- Tombol **"Tulis Ulasan"** — muncul kalau `canReview = true`
- Badge **"Sudah Diulas"** — muncul kalau `alreadyReviewed = true`

Klik "Tulis Ulasan" → buka `ReviewForm` (modal/drawer):
- Bintang interaktif (klik untuk pilih 1–5)
- Textarea komentar (opsional, max 1000 karakter)
- Upload foto (opsional, max 5, preview thumbnail)
- Tombol submit — setelah berhasil: modal tutup, badge "Sudah Diulas" muncul

### 3d. Komponen Baru

| File | Deskripsi |
|---|---|
| `components/StarRating.tsx` | Reusable — mode `display` (read-only, filled by ratingAvg) dan mode `interactive` (click to select) |
| `components/ReviewCard.tsx` | Tampilan satu review: avatar, nama, bintang, komentar, foto, tanggal |
| `components/ReviewForm.tsx` | Modal/drawer form submit review: bintang interaktif + textarea + foto upload |

### 3e. API & Hooks

**Tambah ke `api.ts`:**
```ts
getProductReviews(productId: string, page?: number)
canReview(productId: string, orderId: string)
submitReview(data: FormData)  // multipart: rating, comment, photos[], productId, orderId
```

**Tambah ke `useApi.ts`:**
```ts
useProductReviews(productId: string, page: number)
useCanReview(productId: string, orderId: string)
```

---

## 4. Admin Panel

**Halaman baru**: `client/src/pages/admin/Reviews.tsx`
**Route baru**: `/admin/reviews` — tambah ke `App.tsx` dan sidebar `AdminLayout.tsx`

### Layout

**Filter bar:**
- Search input (nama produk / nama customer)
- Select rating (semua, 1★–5★)
- Select status (semua, visible, hidden)

**Tabel kolom:**
| Produk | Customer | Rating | Komentar | Foto | Status | Tanggal | Aksi |
|---|---|---|---|---|---|---|---|
| nama produk | nama + avatar | ★★★★☆ | 80 char truncated | jumlah | badge | dd/mm/yy | toggle + hapus |

**Aksi per baris:**
- **Toggle visibility** — PATCH visibility, badge berubah langsung, tidak reload halaman
- **Hapus** — konfirmasi dialog, DELETE, row hilang dari list
- **Expand** — klik baris untuk lihat komentar lengkap dan foto full

---

## 5. File Summary

```
Backend:
├── models/Review.js
├── services/recalcProductStats.js
├── routes/reviewRoutes.js
├── routes/adminReviewRoutes.js
└── server.js                          (register 2 routes baru)
    models/Product.js                  (tambah ratingAvg, reviewCount)

Frontend:
├── client/src/components/StarRating.tsx
├── client/src/components/ReviewCard.tsx
├── client/src/components/ReviewForm.tsx
├── client/src/pages/admin/Reviews.tsx
├── client/src/pages/ProductDetail.tsx  (update seksi review)
├── client/src/pages/Products.tsx       (update card)
├── client/src/components/ProductsSection.tsx (update card)
├── client/src/pages/PesananDetail.tsx  (update per item)
├── client/src/services/api.ts          (3 methods baru)
├── client/src/hooks/useApi.ts          (2 hooks baru)
├── client/src/App.tsx                  (route /admin/reviews)
└── client/src/components/AdminLayout.tsx (sidebar entry)
    client/src/types/ecommerce.ts       (tambah Review, ReviewsResponse types)
```

---

## Constraints & Notes

- Review photos upload via Cloudinary (sama dengan pattern yang sudah ada di `middleware/upload.js`)
- `ratingAvg` dibulatkan 1 desimal (misal: 4.3)
- Hidden reviews (`isVisible: false`) tidak masuk hitungan stats dan tidak tampil di public
- Tidak ada fitur edit review — kalau mau ubah, harus hapus via admin dan beli lagi
- Seeds tidak perlu diupdate (review data tidak ada di initial seed)
