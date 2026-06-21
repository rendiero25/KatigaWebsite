# Alamat & Wishlist User Dashboard

**Date:** 2026-06-10  
**Status:** Approved

## Overview

Activate the two disabled nav items in the user dashboard (`/profil`):
1. **Alamat** (`/profil/alamat`) — edit the customer's single default shipping address
2. **Wishlist** (`/profil/wishlist`) — server-side saved products list with heart toggle on product pages

---

## Alamat

### Backend

No new endpoints or model changes needed. `PUT /api/customers/me` in `routes/customerAuthRoutes.js` already accepts `defaultAddress` as part of its body and writes all sub-fields to MongoDB.

Existing fields used:
- `recipientName`, `phone`, `street`, `city`, `province`, `postalCode`
- `areaId`, `areaName` — Biteship fields; not shown in the form (not needed for manual editing)

### API

No new methods. Reuse:
- `api.getCustomerProfile()` — loads current address on mount
- `api.updateCustomerProfile({ defaultAddress: { ... } })` — saves form

### Frontend

**New page** `client/src/pages/AlamatSaya.tsx`:
- Wrapped in `<UserLayout title="Alamat">`.
- On mount: call `getCustomerProfile()`, populate form with `customer.defaultAddress`.
- Form fields: Nama Penerima, Telepon, Jalan/Alamat Lengkap (textarea), Kota, Provinsi, Kode Pos.
- On submit: call `updateCustomerProfile({ defaultAddress: { ... } })`.
- Show success/error inline (same pattern as `PengaturanAkun.tsx`).
- Validation: all fields required except Kode Pos (optional).

**`UserLayout.tsx`** — move Alamat from `NAV_SOON` to `NAV_MAIN`:
```ts
{ label: 'Alamat', icon: MapPin, href: '/profil/alamat' },
```

**`App.tsx`** — add route:
```tsx
<Route path="/profil/alamat" element={<AlamatSaya />} />
```

---

## Wishlist

### Backend

**`models/Customer.js`** — add `wishlist` field:
```js
wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
```

**`routes/customerAuthRoutes.js`** — add 3 endpoints (all protected by `customerAuth`):

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/customers/wishlist` | Returns `{ wishlist: [...populatedProduct] }` |
| `POST` | `/api/customers/wishlist/:productId` | Adds product (idempotent — skip if already present) |
| `DELETE` | `/api/customers/wishlist/:productId` | Removes product |

Populate with: `_id name images price` (minimal fields needed for product cards).

### API (`client/src/services/api.ts`)

Three new methods, all read `customerToken`:

```ts
getWishlist(): Promise<{ wishlist: WishlistProduct[] }>
addToWishlist(productId: string): Promise<void>
removeFromWishlist(productId: string): Promise<void>
```

Add interface:
```ts
interface WishlistProduct {
  _id: string
  name: string
  images: string[]
  price: number
}
```

### Hook (`client/src/hooks/useApi.ts`)

```ts
function useWishlist(): {
  wishlist: WishlistProduct[]
  loading: boolean
  add: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}
```

- Fetch on mount.
- `add` / `remove` do optimistic update (flip local state immediately, revert on API error).

### Heart Icon Component

**New component** `client/src/components/WishlistButton.tsx`:
- Props: `productId: string`, `size?: 'sm' | 'md'`.
- Reads `wishlist` from a `useWishlist` hook call — wait, this would cause too many hook calls across product cards. Instead:

**Revised approach**: `WishlistButton` takes `productId`, `inWishlist`, `onToggle` as props. Parent fetches wishlist once and derives `inWishlist` per card.

Props:
```ts
interface Props {
  productId: string
  inWishlist: boolean
  onToggle: (productId: string, inWishlist: boolean) => void
  size?: 'sm' | 'md'
}
```

Renders as an absolute-positioned circle button on the product card image. If `customerToken` is absent, clicking → `navigate('/masuk')`.

Styles:
- Container: `absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm transition hover:bg-white`
- Icon filled (in wishlist): `Heart` with `fill-red-500 text-red-500`
- Icon outline (not in wishlist): `Heart` with `text-gray-400 hover:text-red-400`

### Products page (`client/src/pages/Products.tsx`)

- Add `useWishlist()` hook call at top of component.
- Pass `inWishlist` and `onToggle` to each `WishlistButton` on product cards.
- Product card already has `relative` wrapper — overlay `WishlistButton` on top-right of the image div.
- `onToggle`: call `add(id)` or `remove(id)` based on current state.

### ProductDetail page (`client/src/pages/ProductDetail.tsx`)

- Same pattern: fetch wishlist, derive `inWishlist` for the single product, render `WishlistButton`.

### Wishlist page (`client/src/pages/WishlistSaya.tsx`)

- Wrapped in `<UserLayout title="Wishlist">`.
- Uses `useWishlist()` hook.
- Renders grid of product cards (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6`).
- Each card: image, name, price, `Link` to `/produk/:id`, `WishlistButton` (always `inWishlist=true` here; remove on toggle).
- Empty state: Heart icon + "Belum ada produk di wishlist. Mulai jelajahi produk kami."

### `UserLayout.tsx`

Move Wishlist from `NAV_SOON` to `NAV_MAIN`:
```ts
{ label: 'Wishlist', icon: Heart, href: '/profil/wishlist' },
```

Remove `NAV_SOON` array and its rendering block entirely (both items are now active).

### `App.tsx`

```tsx
import AlamatSaya from './pages/AlamatSaya'
import WishlistSaya from './pages/WishlistSaya'
// ...
<Route path="/profil/alamat" element={<AlamatSaya />} />
<Route path="/profil/wishlist" element={<WishlistSaya />} />
```

---

## Constraints

- `areaId` and `areaName` are written by the Biteship shipping widget; the Alamat form skips them (pass them through unchanged on save by spreading existing values before overwrite).
- Wishlist stores refs to Product IDs; if a product is deleted, populate returns null — handle with `filter(Boolean)` after populate.
- No pagination on wishlist page — fetch all at once (typical wishlists are small).
- Heart icon only visible to logged-in customers (check `localStorage.getItem('customerToken')`).
- `WishlistButton` is a standalone component; do not call `useWishlist` inside it — parent manages state.
