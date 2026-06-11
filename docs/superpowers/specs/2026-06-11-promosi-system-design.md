# Promotion System Design

**Date:** 2026-06-11  
**Status:** Approved

## Overview

Admin-managed promotion system. Promotions apply a percentage discount to products (individually selected or by category). Active promotions render as a banner + product carousel section on the home page, above "Kualitas yang Kami Jaga dari Hulu ke Hilir". Discounted prices appear everywhere products are shown.

## Constraints

- One product can only be in one active promotion at a time.
- Discount is applied as a percentage of `priceNumeric`.
- Backend computes `activePromotion` per product on each request (Approach A).

---

## Data Model

### `models/Promotion.js` (new)

```
name            String, required
description     String
bannerImage     String  — path in uploads/
startDate       Date, required
endDate         Date, required
type            'products' | 'category'
productIds      [ObjectId → Product]   — used when type='products'
categoryId      ObjectId → ProductCategory  — used when type='category'
discountPercent Number, required, 1–100
isVisible       Boolean, default true
displayOrder    Number, default 0
timestamps      true
```

### Product response augmentation (no schema change)

`GET /api/products` and `GET /api/products/:id` inject a virtual field:

```json
"activePromotion": {
  "_id": "...",
  "name": "Promo Lebaran",
  "discountPercent": 20
}
```

`null` if no active promotion applies. Frontend computes:
`discountedPrice = priceNumeric * (1 - discountPercent / 100)`

---

## Backend

### `routes/promotionRoutes.js` (new)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/promotions` | public | All promotions |
| GET | `/api/promotions/active` | public | `isVisible=true` + date valid, sorted by `displayOrder` |
| GET | `/api/promotions/:id` | public | Single promotion |
| POST | `/api/promotions` | auth | Create (multer banner upload) |
| PUT | `/api/promotions/:id` | auth | Update |
| DELETE | `/api/promotions/:id` | auth | Delete |
| PUT | `/api/promotions/reorder` | auth | Batch update `displayOrder`: `[{ id, displayOrder }]` |
| PATCH | `/api/promotions/:id/toggle` | auth | Flip `isVisible` |

### `routes/productRoutes.js` (modified)

In both list and detail handlers: after fetching products, query Promotion collection for active promotions (`startDate <= now <= endDate`). For each product, find matching promotion by `productIds` includes product ID or `categoryId` matches product's category. Inject `activePromotion` field into response.

### `server.js` (modified)

Register: `app.use('/api/promotions', require('./routes/promotionRoutes'))`

---

## Frontend

### API & Hooks

**`client/src/services/api.ts`** — new methods:
- `getPromotions()`
- `getActivePromotions()`
- `createPromotion(formData: FormData)`
- `updatePromotion(id, formData: FormData)`
- `deletePromotion(id)`
- `reorderPromotions(order: { id: string; displayOrder: number }[])`
- `togglePromotion(id)`

**`client/src/hooks/useApi.ts`** — new hooks:
- `usePromotions()`
- `useActivePromotions()`

### Admin Pages

**`client/src/pages/admin/Promotions.tsx`** (new)

- Route: `/admin/promosi`
- Table listing: name, date range, discount%, active/expired status badge, product count, type badge
- "Tambah Promosi" button opens Sheet with form:
  1. Nama promosi (text input)
  2. Deskripsi (textarea)
  3. Banner image upload (preview)
  4. Durasi: start date + end date pickers
  5. Tipe: radio `Pilih Produk` | `Pilih Kategori`
     - Pilih Produk: product picker table with search (by name) + filter (by category) + sort (name A–Z, price). Multi-select checkboxes. Warning badge if product already in another active promotion.
     - Pilih Kategori: single-select dropdown of all categories
  6. Diskon %: number input, 1–100

**`client/src/pages/admin/PromosiTampilan.tsx`** (new)

- Route: `/admin/promosi/tampilan`
- List of all promotion cards: thumbnail banner, name, date range
- Per card: toggle show/hide (`isVisible`)
- Drag-and-drop reorder (library: `@dnd-kit/core` + `@dnd-kit/sortable` — **needs `npm install`**, not yet in deps)
- "Simpan Urutan" button → calls `reorderPromotions`

**`client/src/components/AdminLayout.tsx`** (modified)

Add sidebar parent "Promosi" with two children:
- Kelola Promosi → `/admin/promosi`
- Tampilan Promosi → `/admin/promosi/tampilan`

**`client/src/App.tsx`** (modified)

Register two new admin routes.

### Public Components

**`client/src/components/PromosiSection.tsx`** (new)

- Position: above "Kualitas yang Kami Jaga dari Hulu ke Hilir" section on home page
- Returns `null` if no active promotions
- Per active promotion (sorted by `displayOrder`):
  - Banner image with overlay: promotion name + discount badge
  - Swiper carousel of products in that promotion — cards show original price (strikethrough) + discounted price + `–XX%` badge
- Multiple active promotions: tabs (one tab per promotion), sorted by `displayOrder`

**Product price display (modified in multiple files)**

Files: `ProductsSection.tsx`, product detail page (`/produk/:id`), public katalog page (`/katalog`).

Logic: if `product.activePromotion`, render:
- Original price strikethrough: `Rp X.XXX`
- Discounted price highlighted: `Rp Y.YYY`
- Badge: `-XX%`

---

## Implementation Order

1. `models/Promotion.js`
2. `routes/promotionRoutes.js` + register in `server.js`
3. Augment product routes with `activePromotion` injection
4. `api.ts` promotion methods
5. `useApi.ts` promotion hooks
6. `Promotions.tsx` admin page (CRUD + product picker)
7. `PromosiTampilan.tsx` admin page (reorder + toggle)
8. `AdminLayout.tsx` + `App.tsx` route registration
9. `PromosiSection.tsx` public home section
10. Update product price display across all card/detail components
