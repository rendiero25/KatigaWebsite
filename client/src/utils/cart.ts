import type { CartItem } from '../types/ecommerce';

const CART_KEY = 'kk_cart';

export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(item: Omit<CartItem, 'quantity'> & { quantity?: number }): void {
  const cart = getCart();
  const existing = cart.find((c) => c.productId === item.productId);
  if (existing) {
    existing.quantity += item.quantity ?? 1;
  } else {
    cart.push({ ...item, quantity: item.quantity ?? 1 });
  }
  saveCart(cart);
  window.dispatchEvent(new Event('cartUpdated'));
}

export function removeFromCart(productId: string): void {
  saveCart(getCart().filter((c) => c.productId !== productId));
  window.dispatchEvent(new Event('cartUpdated'));
}

export function updateQty(productId: string, quantity: number): void {
  if (quantity < 1) { removeFromCart(productId); return; }
  const cart = getCart();
  const item = cart.find((c) => c.productId === productId);
  if (item) { item.quantity = quantity; saveCart(cart); }
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
