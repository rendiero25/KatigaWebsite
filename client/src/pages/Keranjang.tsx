import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import type { CartItem } from '../types/ecommerce';
import { useLiveCart } from '../hooks/useApi';
import { getCart, removeFromCart, updateQty, getSelectedTotal } from '../utils/cart';
import CartItemCard from '../components/CartItemCard';
import RelatedProductsCarousel from '../components/RelatedProductsCarousel';
import Header from '../components/Header';
import Footer from '../components/Footer';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const CHECKOUT_SELECTED_IDS_KEY = 'kk_checkout_selected_ids';

export default function Keranjang() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>(() => getCart());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(getCart().map((item) => item.cartItemId))
  );
  const {
    data: liveCart,
    loading: cartSyncing,
    error: cartSyncError,
    refresh: refreshCart,
    hydrated: cartHydrated,
    issuesByCartItemId,
  } = useLiveCart(cart);

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) {
      navigate('/masuk?redirect=/keranjang');
      return;
    }
    const handler = () => {
      const updated = getCart();
      setCart(updated);
      setSelectedIds((prev) => {
        const next = new Set<string>();
        for (const item of updated) {
          if (prev.has(item.cartItemId)) next.add(item.cartItemId);
        }
        return next;
      });
    };
    window.addEventListener('cartUpdated', handler);
    return () => window.removeEventListener('cartUpdated', handler);
  }, [navigate]);

  const displayCart = liveCart;
  const hasSelectedSyncIssue = displayCart.some(
    (item) => selectedIds.has(item.cartItemId) && Boolean(issuesByCartItemId[item.cartItemId])
  );
  const cartReady = cartHydrated && !hasSelectedSyncIssue;
  const allSelected = displayCart.length > 0 && displayCart.every((i) => selectedIds.has(i.cartItemId));
  const selectedCount = useMemo(
    () => displayCart.filter((i) => selectedIds.has(i.cartItemId)).reduce((s, i) => s + i.quantity, 0),
    [displayCart, selectedIds],
  );
  const selectedTotal = useMemo(
    () => getSelectedTotal(selectedIds, displayCart),
    [displayCart, selectedIds]
  );

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayCart.map((i) => i.cartItemId)));
    }
  };

  const toggleItem = (cartItemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cartItemId)) next.delete(cartItemId);
      else next.add(cartItemId);
      return next;
    });
  };

  const handleCheckout = () => {
    if (!localStorage.getItem('customerToken')) {
      navigate('/masuk?redirect=/checkout');
      return;
    }
    sessionStorage.setItem(CHECKOUT_SELECTED_IDS_KEY, JSON.stringify([...selectedIds]));
    navigate('/checkout', { state: { selectedIds: [...selectedIds] } });
  };

  const categoryIds = useMemo(
    () => [...new Set(displayCart.map((i) => i.categoryId).filter((id): id is string => !!id))],
    [displayCart],
  );
  const productIds = useMemo(() => displayCart.map((i) => i.productId), [displayCart]);

  if (!cartHydrated && displayCart.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center px-4 py-20">
          <p className="text-sm text-[#9A9A9A]">Menyinkronkan keranjang...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (displayCart.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center px-4 py-20">
          <ShoppingBag className="size-12 text-[#D0D0CC] mb-4" />
          <p className="text-base font-semibold text-[#1F1F1F] mb-1">Keranjang masih kosong</p>
          <p className="text-sm text-[#9A9A9A] mb-6">Temukan produk yang kamu suka.</p>
          <Link
            to="/produk"
            className="px-6 py-2.5 bg-[#1F1F1F] text-white text-sm font-medium rounded-md hover:bg-[#2F2F2F] transition-colors"
          >
            Lihat Produk
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F9F7F2] pt-24 pb-0">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 pb-16">
          <h1 className="text-2xl font-semibold text-[#1F1F1F] mb-6">Keranjang Belanja</h1>

          {cartSyncing && (
            <div className="mb-4 rounded-lg border border-[#D4DEFF] bg-[#F0F5FF] px-4 py-3 text-sm text-primary">
              Memperbarui harga dan data pengiriman terbaru...
            </div>
          )}
          {cartSyncError && (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <span>{cartSyncError}</span>
              <button
                onClick={refreshCart}
                className="text-left font-medium text-red-700 hover:underline"
              >
                Coba lagi
              </button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Item list */}
            <div className="flex-1 min-w-0">
              <label className="flex items-center gap-3 bg-white border border-[#E8E8E5] rounded-xl px-4 py-3 mb-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-primary shrink-0"
                />
                <span className="text-sm font-medium text-[#1F1F1F]">Pilih Semua</span>
                <span className="text-sm text-[#9A9A9A] ml-auto">{displayCart.length} produk</span>
              </label>

              <div className="space-y-3">
                {displayCart.map((item) => (
                  <CartItemCard
                    key={item.cartItemId}
                    item={item}
                    selected={selectedIds.has(item.cartItemId)}
                    onToggle={() => toggleItem(item.cartItemId)}
                    onQtyChange={(qty) => updateQty(item.cartItemId, qty)}
                    onRemove={() => removeFromCart(item.cartItemId)}
                  />
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="lg:w-72 shrink-0">
              <div className="bg-primary rounded-xl p-6 sticky top-24">
                <h2 className="text-base font-semibold text-white mb-4">Ringkasan</h2>

                <div className="flex justify-between text-sm text-white/75 mb-1.5">
                  <span>Produk dipilih</span>
                  <span>{selectedCount} item</span>
                </div>
                <div className="flex justify-between text-sm text-white/50 mb-4">
                  <span>Ongkir</span>
                  <span>Dihitung saat checkout</span>
                </div>

                <div className="border-t border-white/15 pt-4 flex justify-between font-semibold text-white mb-5">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{cartReady ? fmt(selectedTotal) : '—'}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={selectedIds.size === 0 || cartSyncing || !cartReady}
                  className="w-full py-3 bg-white text-primary font-semibold rounded-md text-sm hover:bg-[#F7F9FF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {!cartHydrated || cartSyncing
                    ? 'Sinkronisasi...'
                    : selectedIds.size > 0
                    ? `Checkout (${selectedIds.size} Produk)`
                    : 'Pilih Produk'}
                </button>

                <Link
                  to="/produk"
                  className="block text-center text-sm text-white/60 mt-4 hover:text-white transition-colors"
                >
                  Lanjut Belanja
                </Link>
              </div>
            </div>
          </div>
        </div>

        {categoryIds.length > 0 && (
          <RelatedProductsCarousel
            categoryIds={categoryIds}
            excludeIds={productIds}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
