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
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="grow">
          <div className="border-b border-[#E9E9EA] py-6">
            <h1 className="text-center text-2xl md:text-3xl">Keranjang</h1>
          </div>
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-10 animate-pulse">
            <div className="flex flex-col lg:flex-row gap-10">
              <div className="flex-1 space-y-0">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-4 items-start py-5 border-b border-[#E9E9EA]">
                    <div className="w-24 h-24 bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 w-2/3 bg-gray-200" />
                      <div className="h-3 w-1/3 bg-gray-100" />
                      <div className="h-3 w-1/4 bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="lg:w-80 shrink-0">
                <div className="h-56 bg-gray-100" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (displayCart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="grow">
          <div className="border-b border-[#E9E9EA] py-6">
            <h1 className="text-center text-2xl md:text-3xl">Keranjang</h1>
          </div>
          <div className="flex flex-col items-center justify-center px-4 py-24">
            <ShoppingBag className="size-10 text-[#D0D0CC] mb-4" strokeWidth={1.5} />
            <p className="text-[13px] text-[#1E1E1E] mb-1">Keranjang masih kosong</p>
            <p className="text-[13px] text-[#6F6F71] mb-6">Temukan produk yang kamu suka.</p>
            <Link
              to="/produk"
              className="px-8 py-3 border border-[#1E1E1E] text-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] hover:bg-[#1E1E1E] hover:text-white transition-colors"
            >
              Lihat Produk
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="grow">
        <div className="border-b border-[#E9E9EA] py-6">
          <h1 className="text-center text-2xl md:text-3xl">Keranjang</h1>
        </div>

        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-10">
          {cartSyncing && (
            <div className="mb-6 border border-[#E9E9EA] px-4 py-3 text-[13px] text-[#6F6F71]">
              Memperbarui harga dan data pengiriman terbaru...
            </div>
          )}
          {cartSyncError && (
            <div className="mb-6 flex flex-col gap-2 border border-[#E9E9EA] px-4 py-3 text-[13px] text-[#AE4B4B] sm:flex-row sm:items-center sm:justify-between">
              <span>{cartSyncError}</span>
              <button
                onClick={refreshCart}
                className="uppercase tracking-[0.12em] text-[12px] underline underline-offset-2 cursor-pointer"
              >
                Coba lagi
              </button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Item list */}
            <div className="flex-1 min-w-0">
              <label className="flex items-center gap-3 pb-4 border-b border-[#E9E9EA] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-[#1E1E1E] shrink-0"
                />
                <span className="uppercase text-[13px] text-[#1E1E1E]">Pilih Semua</span>
                <span className="text-[13px] text-[#6F6F71] ml-auto">{displayCart.length} produk</span>
              </label>

              <div>
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
            <div className="lg:w-80 shrink-0">
              <div className="sticky top-24">
                <p className="uppercase tracking-[0.12em] text-[11px] text-[#6F6F71] mb-4">Ringkasan</p>

                <div className="flex justify-between text-[13px] text-[#6F6F71] mb-2">
                  <span>Produk dipilih</span>
                  <span>{selectedCount} item</span>
                </div>
                <div className="flex justify-between text-[13px] text-[#6F6F71] mb-4">
                  <span>Ongkir</span>
                  <span>Dihitung saat checkout</span>
                </div>

                <div className="border-t border-[#E9E9EA] pt-4 flex justify-between text-[13px] text-[#1E1E1E] mb-6">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{cartReady ? fmt(selectedTotal) : '—'}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={selectedIds.size === 0 || cartSyncing || !cartReady}
                  className="w-full bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {!cartHydrated || cartSyncing
                    ? 'Sinkronisasi...'
                    : selectedIds.size > 0
                    ? `Lanjut ke Checkout (${selectedIds.size})`
                    : 'Pilih Produk'}
                </button>

                <Link
                  to="/produk"
                  className="block text-center text-[13px] text-[#6F6F71] mt-4 hover:text-[#1E1E1E] transition-colors"
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
    </div>
  );
}
