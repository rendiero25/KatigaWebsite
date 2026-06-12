import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CartItem } from '../types/ecommerce';
import { getCart, removeFromCart, updateQty, getSelectedTotal } from '../utils/cart';
import CartItemCard from '../components/CartItemCard';
import RelatedProductsCarousel from '../components/RelatedProductsCarousel';
import Header from '../components/Header';
import Footer from '../components/Footer';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Keranjang() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) {
      navigate('/masuk?redirect=/keranjang');
      return;
    }
    const c = getCart();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(c);
    setSelectedIds(new Set(c.map((i) => i.productId)));
    const handler = () => {
      const updated = getCart();
      setCart(updated);
      setSelectedIds((prev) => {
        const next = new Set<string>();
        for (const item of updated) {
          if (prev.has(item.productId)) next.add(item.productId);
        }
        return next;
      });
    };
    window.addEventListener('cartUpdated', handler);
    return () => window.removeEventListener('cartUpdated', handler);
  }, [navigate]);

  const allSelected = cart.length > 0 && cart.every((i) => selectedIds.has(i.productId));
  const selectedCount = useMemo(
    () => cart.filter((i) => selectedIds.has(i.productId)).reduce((s, i) => s + i.quantity, 0),
    [cart, selectedIds],
  );
  const selectedTotal = useMemo(() => getSelectedTotal(selectedIds, cart), [cart, selectedIds]);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cart.map((i) => i.productId)));
    }
  };

  const toggleItem = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleCheckout = () => {
    if (!localStorage.getItem('customerToken')) {
      navigate('/masuk?redirect=/checkout');
      return;
    }
    navigate('/checkout', { state: { selectedIds: [...selectedIds] } });
  };

  const categoryIds = useMemo(
    () => [...new Set(cart.map((i) => i.categoryId).filter((id): id is string => !!id))],
    [cart],
  );
  const productIds = useMemo(() => cart.map((i) => i.productId), [cart]);

  if (cart.length === 0) {
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
                  Pilih Semua ({cart.length} produk)
                </span>
              </label>

              <div className="space-y-3">
                {cart.map((item) => (
                  <CartItemCard
                    key={item.productId}
                    item={item}
                    selected={selectedIds.has(item.productId)}
                    onToggle={() => toggleItem(item.productId)}
                    onQtyChange={(qty) => updateQty(item.productId, qty)}
                    onRemove={() => removeFromCart(item.productId)}
                  />
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="lg:w-72 shrink-0">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 sticky top-24">
                <h2 className="text-base font-bold text-black mb-4">Ringkasan</h2>
                <div className="flex justify-between text-sm text-black/70 mb-1">
                  <span>Produk dipilih</span>
                  <span>{selectedCount} item</span>
                </div>
                <div className="flex justify-between text-sm text-black/60 mb-4">
                  <span>Ongkir</span>
                  <span>Dihitung saat checkout</span>
                </div>
                <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-black mb-6">
                  <span>Subtotal</span>
                  <span>{fmt(selectedTotal)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={selectedIds.size === 0}
                  className="w-full py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 text-sm"
                >
                  {selectedIds.size > 0
                    ? `Checkout (${selectedIds.size} Produk)`
                    : 'Pilih Produk'}
                </button>
                <Link
                  to="/produk"
                  className="block text-center text-sm text-black/60 mt-4 hover:text-black"
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
