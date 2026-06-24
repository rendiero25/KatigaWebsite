import type { CartItem, ItemDimensions } from '../types/ecommerce';

const CART_KEY = 'kk_cart';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPositiveInteger = (value: unknown, fallback = 1): number => {
  const parsed = Math.floor(toFiniteNumber(value, fallback));
  return parsed > 0 ? parsed : fallback;
};

export function buildCartItemId(productId: string, variantId?: string): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

export function normalizeDimensions(
  dimensions?: Partial<Record<keyof ItemDimensions, unknown>> | null,
  fallbackDimensions?: Partial<Record<keyof ItemDimensions, unknown>> | null
): ItemDimensions {
  const resolveDimension = (value: unknown, fallbackValue: unknown): number => {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }

    const fallbackParsed = Number(fallbackValue);
    return Number.isFinite(fallbackParsed) && fallbackParsed > 0 ? fallbackParsed : 1;
  };

  return {
    length: resolveDimension(dimensions?.length, fallbackDimensions?.length),
    width: resolveDimension(dimensions?.width, fallbackDimensions?.width),
    height: resolveDimension(dimensions?.height, fallbackDimensions?.height),
  };
}

export function normalizeCartItem(raw: unknown): CartItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const productId = typeof raw.productId === 'string' ? raw.productId : '';
  if (!productId) {
    return null;
  }

  const variantId =
    typeof raw.variantId === 'string' && raw.variantId.trim()
      ? raw.variantId
      : undefined;
  const variantName =
    typeof raw.variantName === 'string' && raw.variantName.trim()
      ? raw.variantName
      : undefined;
  const cartItemId =
    typeof raw.cartItemId === 'string' && raw.cartItemId.trim()
      ? raw.cartItemId
      : buildCartItemId(productId, variantId);
  const dimensions = isRecord(raw.dimensions)
    ? normalizeDimensions({
        length: raw.dimensions.length,
        width: raw.dimensions.width,
        height: raw.dimensions.height,
      })
    : normalizeDimensions();

  return {
    cartItemId,
    productId,
    variantId,
    variantName,
    name: typeof raw.name === 'string' ? raw.name : '',
    image: typeof raw.image === 'string' ? raw.image : '',
    priceNumeric: toFiniteNumber(raw.priceNumeric),
    weightGrams: toFiniteNumber(raw.weightGrams),
    dimensions,
    quantity: toPositiveInteger(raw.quantity),
    originalPrice:
      raw.originalPrice === undefined ? undefined : toFiniteNumber(raw.originalPrice),
    discountPercent:
      raw.discountPercent === undefined ? undefined : toFiniteNumber(raw.discountPercent),
    categoryId: typeof raw.categoryId === 'string' ? raw.categoryId : undefined,
  };
}

export function getCart(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    const rawCart = Array.isArray(parsed) ? parsed : [];
    const normalizedCart = rawCart
      .map(normalizeCartItem)
      .filter((item): item is CartItem => item !== null);

    if (JSON.stringify(rawCart) !== JSON.stringify(normalizedCart)) {
      saveCart(normalizedCart);
    }

    return normalizedCart;
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
  const normalizedItem: CartItem = {
    ...item,
    cartItemId: item.cartItemId || buildCartItemId(item.productId, item.variantId),
    dimensions: normalizeDimensions(item.dimensions),
    quantity: item.quantity ?? 1,
  };
  const existing = cart.find((c) => c.cartItemId === normalizedItem.cartItemId);
  if (existing) {
    existing.quantity += normalizedItem.quantity;
  } else {
    cart.push(normalizedItem);
  }
  saveCart(cart);
  window.dispatchEvent(new Event('cartUpdated'));
}

export function removeFromCart(cartItemId: string): void {
  saveCart(getCart().filter((c) => c.cartItemId !== cartItemId));
  window.dispatchEvent(new Event('cartUpdated'));
}

export function removeManyFromCart(cartItemIds: string[]): void {
  if (!cartItemIds.length) {
    return;
  }

  const idsToRemove = new Set(cartItemIds);
  saveCart(getCart().filter((c) => !idsToRemove.has(c.cartItemId)));
  window.dispatchEvent(new Event('cartUpdated'));
}

export function syncCartItems(items: CartItem[]): void {
  if (!items.length) {
    return;
  }

  const currentCart = getCart();
  const nextById = new Map(
    items.map((item) => [
      item.cartItemId,
      {
        ...item,
        cartItemId: item.cartItemId || buildCartItemId(item.productId, item.variantId),
        dimensions: normalizeDimensions(item.dimensions),
        quantity: toPositiveInteger(item.quantity),
      },
    ])
  );

  let changed = false;
  const nextCart = currentCart.map((item) => {
    const replacement = nextById.get(item.cartItemId);
    if (!replacement) {
      return item;
    }

    const nextItem = {
      ...replacement,
      quantity: item.quantity,
    };

    if (JSON.stringify(item) !== JSON.stringify(nextItem)) {
      changed = true;
      return nextItem;
    }

    return item;
  });

  if (!changed) {
    return;
  }

  saveCart(nextCart);
  window.dispatchEvent(new Event('cartUpdated'));
}

export function updateQty(cartItemId: string, quantity: number): void {
  if (quantity < 1) {
    removeFromCart(cartItemId);
    return;
  }
  const cart = getCart();
  const item = cart.find((c) => c.cartItemId === cartItemId);
  if (item) {
    item.quantity = quantity;
    saveCart(cart);
  }
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

export function getSelectedTotal(selectedIds: Set<string>, cart?: CartItem[]): number {
  return (cart ?? getCart())
    .filter((c) => selectedIds.has(c.cartItemId))
    .reduce((sum, c) => sum + c.priceNumeric * c.quantity, 0);
}
