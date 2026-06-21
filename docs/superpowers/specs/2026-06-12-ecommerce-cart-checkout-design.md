# E-Commerce Cart & Checkout Enhancement

**Date:** 2026-06-12
**Scope:** Keranjang (Cart) + Checkout pages — checkbox selection, discount display, related carousel, saved addresses, voucher system, Midtrans + Biteship integration

---

## 1. Overview

Enhance existing `Keranjang.tsx` and `Checkout.tsx` with:
- Partial checkout via checkbox selection
- Discount display (strikethrough + badge) from CartItem snapshot
- Related products carousel (all categories in cart)
- Multiple saved addresses with add/edit/delete
- Voucher/coupon system (new model, backend validation)
- Refactor into reusable components

Payment: Midtrans Snap (existing). Shipping: Biteship (existing). ENV keys already placeholdered.

---

## 2. Data Layer

### 2.1 CartItem type additions (`types/ecommerce.ts`)

```ts
interface CartItem {
  productId: string;
  name: string;
  image: string;
  priceNumeric: number;       // final price (post-discount)
  weightGrams: number;
  quantity: number;
  originalPrice?: number;     // pre-discount price; undefined = no discount
  discountPercent?: number;   // e.g. 20 for "20% OFF"
  categoryId?: string;        // for related products carousel
}
```

Discount fields are snapshots captured at add-to-cart time so they reflect the promo active when user added the item.

### 2.2 New types

```ts
interface SavedAddress {
  _id: string;
  label: string;              // "Rumah", "Kantor", etc.
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

interface VoucherValidation {
  valid: boolean;
  voucherId?: string;
  discountAmount?: number;
  message: string;
}
```

### 2.3 Updated CreateOrderPayload

```ts
interface CreateOrderPayload {
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
```

---

## 3. Backend

### 3.1 New model: `models/Voucher.js`

| Field | Type | Notes |
|---|---|---|
| `code` | String unique | stored UPPERCASE |
| `name` | String | display name |
| `description` | String | terms shown to user |
| `discountType` | `'percent' \| 'fixed'` | |
| `discountValue` | Number | 10 = 10%, 50000 = Rp 50.000 |
| `minOrderAmount` | Number | minimum subtotal to apply |
| `maxDiscount` | Number | cap for percent type (0 = no cap) |
| `usageLimit` | Number | total uses (0 = unlimited) |
| `usedCount` | Number | current usage count |
| `perUserLimit` | Number | per-customer cap (0 = unlimited) |
| `startDate` | Date | |
| `endDate` | Date | |
| `isActive` | Boolean | |

### 3.2 Customer model update: `models/Customer.js`

Add `addresses` array:
```js
addresses: [{
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
}]
```

`defaultAddress` (existing field) stays — synced automatically when `isDefault` address changes.

### 3.3 Order model update: `models/Order.js`

```js
voucherCode:     { type: String, default: '' },
voucherDiscount: { type: Number, default: 0 },
```

`total` = subtotal − voucherDiscount + shippingCost.

### 3.4 New route: `routes/vouchers.js`

```
POST /api/vouchers/validate   (customer auth required)
  body: { code: string, subtotal: number }
  validates:
    - isActive === true
    - now between startDate and endDate
    - subtotal >= minOrderAmount
    - usedCount < usageLimit (if usageLimit > 0)
    - per-user usage <= perUserLimit (if > 0)
      → check via: Order.countDocuments({ customer: req.customer._id, voucherCode: code })
  returns: { valid, voucherId, discountAmount, message }
```

Admin CRUD for vouchers is a separate task (not in this scope).

### 3.5 New route: `routes/customerAddresses.js`

```
GET    /api/customers/me/addresses           list all
POST   /api/customers/me/addresses           add new
PUT    /api/customers/me/addresses/:id       update
DELETE /api/customers/me/addresses/:id       delete
PATCH  /api/customers/me/addresses/:id/default  set as default
```

All endpoints require customer auth. Setting a new default clears `isDefault` on all others and syncs `customer.defaultAddress`.

### 3.6 Orders route update: `routes/orders.js`

`POST /api/orders` — accept `voucherCode` + `voucherDiscount`:
1. Re-validate voucher server-side (same logic as validate endpoint)
2. If invalid → return 400
3. If valid → create order with voucher fields, increment `usedCount`

### 3.7 `server.js` additions

```js
app.use('/api/vouchers', require('./routes/vouchers'));
app.use('/api/customers/me/addresses', require('./routes/customerAddresses'));
```

---

## 4. Cart Page (Keranjang.tsx)

### 4.1 New components

**`CartItemCard.tsx`**
- Props: `item: CartItem`, `selected: boolean`, `onToggle`, `onQtyChange`, `onRemove`
- Shows: checkbox, image, name, discount badge + strikethrough price (if `originalPrice` exists), final price, qty control, hapus button
- Discount display: badge `"20% OFF"` in red + `~~Rp 100.000~~` + `Rp 80.000 bold`

**`RelatedProductsCarousel.tsx`**
- Fetches: `GET /api/products?categories=cat1,cat2&exclude=id1,id2&limit=12`
- Excludes items already in cart
- Swiper carousel, same style as existing carousels
- Only renders if API returns ≥ 1 product
- Positioned below cart section, above Footer

### 4.2 Keranjang.tsx changes

- State: `selectedIds: Set<string>` — default all selected on mount
- "Pilih Semua" checkbox: toggles all
- Summary panel shows subtotal of selected items only (`getSelectedTotal`)
- Checkout button: `"Checkout (N Item)"`, disabled if `selectedIds.size === 0`
- On checkout: `navigate('/checkout', { state: { selectedIds: [...selectedIds] } })`
- Unchecked items stay in cart (not removed)

### 4.3 cart.ts additions

```ts
getSelectedTotal(selectedIds: Set<string>): number
// addToCart: accept originalPrice?, discountPercent?, categoryId?
```

---

## 5. Checkout Page (Checkout.tsx)

### 5.1 New components

**`AddressSelector.tsx`**
- Props: `onSelect(address: ShippingAddress)`, `selected: ShippingAddress | null`
- Shows saved addresses as radio cards (label chip, name, phone, full address, "Utama" badge)
- "Tambah Alamat Baru" expands inline form with Biteship area search
- New address form has: label input, "Jadikan utama" checkbox, "Simpan ke profil" checkbox
- If "Simpan ke profil" checked → POST to address route on confirm

**`ShippingSelector.tsx`**
- Extracted from existing Checkout.tsx Biteship logic
- Props: `address: ShippingAddress`, `cart: CartItem[]`, `onSelect(rate: ShippingRate)`
- Visible only after address selected

**`VoucherInput.tsx`**
- Props: `subtotal: number`, `onApply(validation: VoucherValidation)`, `onClear()`
- Input + "Pakai" button
- Success: green chip `"DISKON10 — Hemat Rp 25.000 ✕"`
- Error: inline message e.g. "Min. pembelian Rp 500.000"
- Visible after shipping selected; voucher is optional

### 5.2 Checkout.tsx changes

- Read `location.state.selectedIds` → filter cart; fallback to all cart items
- Use `AddressSelector` instead of inline address form
- Use `ShippingSelector` instead of inline Biteship logic
- Add `VoucherInput` between shipping and summary
- Summary panel: item list + subtotal + voucher discount line + ongkir + total
- `handlePay`: include `voucherCode` + `voucherDiscount` in payload
- Button enabled only when `selectedAddress` and `selectedRate` both set

### 5.3 Summary panel calculation

```
subtotal         = sum of (item.priceNumeric × item.quantity)
voucherDiscount  = from VoucherValidation.discountAmount (0 if none)
ongkir           = selectedRate.price (0 if not yet selected)
total            = subtotal - voucherDiscount + ongkir
```

---

## 6. API & Hooks

### 6.1 New methods in `api.ts`

```ts
getCustomerAddresses(): Promise<SavedAddress[]>
addCustomerAddress(data: Omit<SavedAddress, '_id'>): Promise<SavedAddress>
updateCustomerAddress(id: string, data: Partial<SavedAddress>): Promise<SavedAddress>
deleteCustomerAddress(id: string): Promise<void>
setDefaultAddress(id: string): Promise<void>
validateVoucher(code: string, subtotal: number): Promise<VoucherValidation>
```

### 6.2 New hooks in `useApi.ts`

```ts
useCustomerAddresses()
  → { addresses, loading, addAddress, updateAddress, deleteAddress, setDefault, refresh }

useVoucher()
  → { voucher, applying, error, apply(code, subtotal), clear }
```

---

## 7. File Change List

| Action | File |
|---|---|
| Create | `models/Voucher.js` |
| Create | `routes/vouchers.js` |
| Create | `routes/customerAddresses.js` |
| Create | `client/src/components/CartItemCard.tsx` |
| Create | `client/src/components/RelatedProductsCarousel.tsx` |
| Create | `client/src/components/AddressSelector.tsx` |
| Create | `client/src/components/ShippingSelector.tsx` |
| Create | `client/src/components/VoucherInput.tsx` |
| Edit | `models/Customer.js` |
| Edit | `models/Order.js` |
| Edit | `routes/orders.js` |
| Edit | `server.js` |
| Edit | `client/src/types/ecommerce.ts` |
| Edit | `client/src/utils/cart.ts` |
| Edit | `client/src/services/api.ts` |
| Edit | `client/src/hooks/useApi.ts` |
| Edit | `client/src/pages/Keranjang.tsx` |
| Edit | `client/src/pages/Checkout.tsx` |

---

## 8. Out of Scope (separate tasks)

- Admin panel for Voucher CRUD
- Order history showing voucher discount
- Push notification / email order confirmation
- COD payment method
