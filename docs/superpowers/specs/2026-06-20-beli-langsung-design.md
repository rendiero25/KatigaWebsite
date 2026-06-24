# Beli Langsung (Buy Now) Button

**Date:** 2026-06-20
**Scope:** `ProductDetail.tsx` + `Checkout.tsx` — direct-to-checkout purchase path for a single product, bypassing the cart entirely. Frontend-only; no backend changes.

---

## 1. Overview

Add a "Beli Langsung" button on the product detail page (`/produk/:id`), next to the existing "Tambah ke Keranjang" button. Clicking it sends the user straight to `/checkout` with exactly one item (the currently selected variant + quantity on the page), **without ever touching the real cart** (`kk_cart` in localStorage).

Mechanism mirrors the existing `selectedIds` pattern already used by the Keranjang → Checkout flow: a `location.state` field backed by a `sessionStorage` fallback for refresh-survival. No backend changes are needed — `createOrder`, shipping-rate lookup, and voucher validation are already generic over the items array.

---

## 2. Data Layer

### 2.1 `utils/cart.ts` — export existing private function

`normalizeCartItem` (currently private, used internally by `getCart()`) is exported so `Checkout.tsx` can reuse the same shape-validation logic when reading the buy-now item back out of `sessionStorage`.

```ts
export function normalizeCartItem(raw: unknown): CartItem | null { ... } // body unchanged
```

No other changes to `cart.ts`. `addToCart`, `getCart`, etc. are not touched — the buy-now item never passes through them.

### 2.2 No type changes

`CartItem` and `CreateOrderPayload` (`types/ecommerce.ts`) are reused as-is. The buy-now item is a single `CartItem` object, built the same way `handleAddToCart` already builds one.

---

## 3. Product Detail Page (`ProductDetail.tsx`)

### 3.1 Button layout

Current layout: qty selector → "Tambah ke Keranjang" (full-width, gradient primary) → row of "Bagikan" / "Suka" (50/50, outline).

New layout:
- "Tambah ke Keranjang" and "Beli Langsung" become a single `flex gap-3` row, each `flex-1` (50/50), matching the existing Bagikan/Suka row pattern.
- "Beli Langsung" takes the gradient-primary style currently used by "Tambah ke Keranjang" (`bg-gradient-to-br from-[#4F68AF] to-[#2B3A67]`).
- "Tambah ke Keranjang" becomes `variant="outline"`, matching the Bagikan/Suka outline style.
- Both buttons stay inside the existing `{hasPrice && (...)}` block, so they're hidden together for priceless products — no new conditional needed.
- Icon: reuse an existing lucide-react import style; add `Zap` for "Beli Langsung" (`ShoppingCart` stays on "Tambah ke Keranjang").

### 3.2 `handleBuyNow` handler

Mirrors `handleAddToCart`'s token check, price/promo calculation, and weight/dimension resolution exactly — but instead of calling `addToCart(...)`, it stores the item and navigates:

```ts
const BUY_NOW_ITEM_KEY = 'kk_buy_now_item';

const handleBuyNow = () => {
  if (!localStorage.getItem('customerToken')) {
    navigate(`/masuk?redirect=/produk/${id}`); // same target as handleAddToCart, NOT /checkout
    return;
  }

  const promo = product.activePromotion;
  const basePrice = selectedVariant !== null && selectedVariant.price > 0
    ? selectedVariant.price
    : (product.priceNumeric ?? 0);
  const discountedPrice = promo
    ? Math.round(basePrice * (1 - promo.discountPercent / 100))
    : basePrice;
  const weightGrams =
    selectedVariant !== null && selectedVariant.weightGrams > 0
      ? selectedVariant.weightGrams
      : (product.weightGrams ?? 0);

  const buyNowItem: CartItem = {
    cartItemId: buildCartItemId(product._id, selectedVariant?._id),
    productId: product._id,
    variantId: selectedVariant?._id,
    variantName: selectedVariant?.name,
    name: selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name,
    image: activeImage || product.image || '',
    priceNumeric: discountedPrice,
    weightGrams,
    dimensions: normalizeDimensions(selectedVariant?.dimensions, product.dimensions),
    quantity: qty,
    originalPrice: promo ? basePrice : undefined,
    discountPercent: promo ? promo.discountPercent : undefined,
    categoryId: product.category?._id ?? undefined,
  };

  sessionStorage.setItem(BUY_NOW_ITEM_KEY, JSON.stringify(buyNowItem));
  navigate('/checkout', { state: { buyNowItem } });
};
```

No new loading state — the handler is synchronous (build object, write sessionStorage, navigate). All price/stock/promo re-validation happens once on `Checkout.tsx` via the existing `useLiveCart` hook, same as the cart flow.

---

## 4. Checkout Page (`Checkout.tsx`)

### 4.1 New constant + helper

```ts
const BUY_NOW_ITEM_KEY = 'kk_buy_now_item';

const getStoredBuyNowItem = (): CartItem | null => {
  try {
    const raw = sessionStorage.getItem(BUY_NOW_ITEM_KEY);
    if (!raw) return null;
    return normalizeCartItem(JSON.parse(raw));
  } catch {
    return null;
  }
};
```

`LocationState` gains a field:

```ts
interface LocationState {
  selectedIds?: string[];
  buyNowItem?: CartItem;
}
```

### 4.2 Mount effect — new branch before the existing `selectedIds` logic

```ts
const state = location.state as LocationState | null;
const buyNowItem = state?.buyNowItem ?? getStoredBuyNowItem();

if (buyNowItem) {
  sessionStorage.setItem(BUY_NOW_ITEM_KEY, JSON.stringify(buyNowItem));
  sessionStorage.removeItem(CHECKOUT_SELECTED_IDS_KEY); // invalidate any stale cart-checkout session
  setCart([buyNowItem]);
  return;
}

sessionStorage.removeItem(BUY_NOW_ITEM_KEY); // cart-flow is active → drop any stale buy-now session
// ...existing selectedIds logic, unchanged
```

Whichever path is entered freshest via `location.state` (a fresh "Beli Langsung" click, or a fresh "Checkout" from Keranjang) wins and clears the other's `sessionStorage` key, so a stale session can't resurrect later. A bare page refresh (no `location.state`) falls back to whichever `sessionStorage` key is still present.

### 4.3 Everything downstream is unchanged

`useLiveCart`, `ShippingSelector`, `VoucherInput`, subtotal/total calculation, and the summary panel are all generic over `effectiveCart` — they work for a 1-item array with no modification.

### 4.4 `handlePay` cleanup

In the `onSuccess` / `onPending` / `onClose` callbacks, add `sessionStorage.removeItem(BUY_NOW_ITEM_KEY)` alongside the existing `clearCheckoutSelection()` call. `removePurchasedItems()` (`removeManyFromCart`) is left unchanged — it's a safe no-op for the buy-now item's `cartItemId` since that id was never written to `kk_cart`.

On `onError` (payment failure), neither sessionStorage key is cleared — same as current behavior — so the user can retry "Bayar Sekarang" without losing context.

---

## 5. Edge Cases & Error Handling

| Case | Behavior |
|---|---|
| Product has no price (`hasPrice === false`) | Button hidden (shared conditional block with "Tambah ke Keranjang") |
| Not logged in | Redirect to `/masuk?redirect=/produk/{id}` (back to product, not to checkout) before any state is written |
| Payment fails (`onError`) | `kk_buy_now_item` kept in sessionStorage; user can retry "Bayar Sekarang" |
| Price/promo changed server-side since button click | Reconciled automatically by `useLiveCart` re-fetching the product, same as cart flow |
| Bare `/checkout` visit with no state and no sessionStorage keys | Redirect to `/keranjang` (unchanged existing behavior) |
| User reaches `handlePay` resolution — payment success/pending, or closes the Snap modal | Both sessionStorage keys cleared (§4.4). A later direct `/checkout` visit with no `location.state` redirects to `/keranjang`. |
| User abandons checkout *before* clicking "Bayar Sekarang" (e.g. navigates away) | `kk_buy_now_item` is **not** cleared — a later bare `/checkout` visit would resurface that same stale item. This matches the existing, already-shipped behavior of `kk_checkout_selected_ids` in the cart flow (same gap, not a regression introduced here). |
| User does a cart-checkout after an abandoned buy-now attempt | The cart-flow's fresh `location.state.selectedIds` clears `kk_buy_now_item` (§4.2), so the abandoned buy-now item can't leak into the new cart checkout. |

---

## 6. Manual Test Plan

No automated test suite in this project (see `CLAUDE.md`) — verify in-browser:

1. Open `/produk/:id` for a product with a price and variants. Pick a variant, set qty to 3, click "Beli Langsung" → lands on `/checkout` with exactly 1 line item, qty 3, correct (post-promo) price.
2. Open `/keranjang` in another tab → contents unchanged by step 1.
3. Complete address + shipping (+ optional voucher) → "Bayar Sekarang" opens Midtrans Snap.
4. Refresh `/checkout` before paying → buy-now item still shown (sessionStorage fallback works).
5. Log out, click "Beli Langsung" → redirected to login with `redirect=/produk/:id`; after login, lands back on the product page.
6. After completing/closing a payment, navigate to `/checkout` directly via the URL bar → redirected to `/keranjang` (proves cleanup ran).
7. Regression: from `/keranjang`, select a few items → "Checkout" → still works exactly as before.
8. `cd client && npx tsc --noEmit && npm run lint` — both must pass before commit.

---

## 7. File Change List

| Action | File |
|---|---|
| Edit | `client/src/utils/cart.ts` (export `normalizeCartItem`) |
| Edit | `client/src/pages/ProductDetail.tsx` (button layout + `handleBuyNow`) |
| Edit | `client/src/pages/Checkout.tsx` (buy-now branch in mount effect + cleanup in `handlePay`) |

---

## 8. Out of Scope

- "Beli Langsung" on the catalog/listing cards (`/produk` grid) — detail-page only, per decision.
- Any backend route, model, or API contract changes.
- Stock/inventory cap enforcement on the quantity selector — unchanged from existing "Tambah ke Keranjang" behavior.
