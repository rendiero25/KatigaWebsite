# Ulasan Saya — Design Spec

**Date:** 2026-06-18  
**Status:** Approved

## Overview

Tambah menu "Ulasan Saya" di user dashboard yang menampilkan semua review yang sudah ditulis oleh customer. Read-only — customer tidak bisa edit atau hapus; hanya admin yang bisa.

---

## Section 1: Backend

**File:** `routes/reviewRoutes.js` (tambah endpoint, tidak buat file baru)

```
GET /api/reviews/my?page=1&limit=10
```

- **Auth:** `customerAuth` middleware
- **Filter:** `{ customer: req.customer._id }`
- **Populate:** `product` → field `name` dan `image` saja
- **Sort:** `createdAt: -1` (terbaru duluan)
- **Response:**
  ```json
  {
    "reviews": [...],
    "total": 12,
    "page": 1,
    "pages": 2
  }
  ```

Tidak ada perubahan model — Review schema sudah memiliki semua field yang dibutuhkan.

---

## Section 2: Frontend Data Layer

### `client/src/types/ecommerce.ts`

Tambah dua interface baru:

```typescript
interface MyReview {
  _id: string;
  product: { _id: string; name: string; image: string };
  rating: number;
  comment: string;
  createdAt: string;
}

interface MyReviewsResponse {
  reviews: MyReview[];
  total: number;
  page: number;
  pages: number;
}
```

### `client/src/services/api.ts`

Tambah satu method:

```typescript
getMyReviews(page = 1): Promise<MyReviewsResponse>
// GET /api/reviews/my?page=1&limit=10
```

### `client/src/hooks/useApi.ts`

Tambah satu hook:

```typescript
useMyReviews(page: number)
// wraps api.getMyReviews(page) dengan useState + useEffect
// returns: { data, loading, error }
```

---

## Section 3: Page & Routing

### File baru: `client/src/pages/UlasanSaya.tsx`

- **Route:** `/profil/ulasan`
- **Hook:** `useMyReviews(page)`
- **Layout:** ikuti pola WishlistSaya.tsx / Pesanan.tsx (same dashboard shell)

### Review Card

Setiap card menampilkan:
- Thumbnail produk (kiri) + nama produk + rating bintang (kanan)
- Teks komentar (full, tidak di-truncate)
- Tanggal review (format: "18 Juni 2026")
- Border card, spacing konsisten dengan card di halaman dashboard lain

### Empty State

Ditampilkan saat `total === 0`:
- Ikon bintang + teks: "Belum ada ulasan. Selesaikan pembelian dan bagikan pengalamanmu!"

### Pagination

- Tombol Prev / Next di bawah list
- Pola sama seperti halaman AdminOrders

### Routing (`client/src/App.tsx`)

```tsx
<Route path="/profil/ulasan" element={<UlasanSaya />} />
```

### Sidebar

Tambah link "Ulasan Saya" di `client/src/components/UserLayout.tsx`, ditempatkan setelah "Pesanan Saya".

---

## File Changes Summary

| File | Action |
|------|--------|
| `routes/reviewRoutes.js` | Add `GET /api/reviews/my` endpoint |
| `client/src/types/ecommerce.ts` | Add `MyReview`, `MyReviewsResponse` interfaces |
| `client/src/services/api.ts` | Add `getMyReviews()` method |
| `client/src/hooks/useApi.ts` | Add `useMyReviews()` hook |
| `client/src/pages/UlasanSaya.tsx` | New page (create) |
| `client/src/App.tsx` | Register `/profil/ulasan` route |
| `client/src/components/UserLayout.tsx` | Add "Ulasan Saya" sidebar link |
