import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
        <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-20">
          <p className="text-black/60">Menyinkronkan keranjang...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (displayCart.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-20">
          <p className="text-2xl font-bold text-black mb-4">Keranjang Kosong</p>
          <p className="text-black/60 mb-8">Belum ada produk di keranjang kamu.</p>
          <Link
            to="/produk"
            className="inline-flex items-center px-8 py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full transition"
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
      <main className="min-h-screen bg-white pt-10 pb-0">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 pb-16">
          <h1 className="text-3xl font-bold text-black mb-6">Keranjang Belanja</h1>
          {cartSyncing && (
            <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Memperbarui harga dan data pengiriman terbaru...
            </div>
          )}
          {cartSyncError && (
            <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <span>{cartSyncError}</span>
              <button
                onClick={refreshCart}
                className="text-left font-medium text-red-700 hover:underline"
              >
                Coba lagi
              </button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Item list */}
            <div className="flex-1 min-w-0">
              {/* Select all */}
              <label className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium text-black">
                  Pilih Semua ({displayCart.length} produk)
                </span>
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
              <div className="bg-black border border-white/10 rounded-2xl p-6 sticky top-24 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                <h2 className="text-base font-bold text-white mb-4">Ringkasan</h2>
                <div className="flex justify-between text-sm text-white/70 mb-1">
                  <span>Produk dipilih</span>
                  <span>{selectedCount} item</span>
                </div>
                <div className="flex justify-between text-sm text-white/50 mb-4">
                  <span>Ongkir</span>
                  <span>Dihitung saat checkout</span>
                </div>
                <div className="border-t border-white/10 pt-4 flex justify-between font-bold text-white mb-6">
                  <span>Subtotal</span>
                  <span>{cartReady ? fmt(selectedTotal) : '—'}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={selectedIds.size === 0 || cartSyncing || !cartReady}
                  className="w-full py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 text-sm"
                >
                  {!cartHydrated || cartSyncing
                    ? 'Sinkronisasi...'
                    : selectedIds.size > 0
                    ? `Checkout (${selectedIds.size} Produk)`
                    : 'Pilih Produk'}
                </button>
                <Link
                  to="/produk"
                  className="block text-center text-sm text-white/50 mt-4 hover:text-white transition-colors"
                >
                  Lanjut Belanja
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Related products carousel — above footer */}
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
