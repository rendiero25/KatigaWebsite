import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CartItem } from '../types/ecommerce';
import { getCart, removeFromCart, updateQty, getCartTotal } from '../utils/cart';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Keranjang() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    setCart(getCart());
    const handler = () => setCart(getCart());
    window.addEventListener('cartUpdated', handler);
    return () => window.removeEventListener('cartUpdated', handler);
  }, []);

  const handleCheckout = () => {
    const token = localStorage.getItem('customerToken');
    if (!token) { navigate('/masuk?redirect=/checkout'); return; }
    navigate('/checkout');
  };

  if (cart.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center px-4 py-20">
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
      <main className="min-h-screen bg-[#F9F7F2] pt-10 pb-20">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <h1 className="text-3xl font-bold text-black mb-8">Keranjang Belanja</h1>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Item list */}
            <div className="flex-1 space-y-4">
              {cart.map((item) => (
                <div key={item.productId} className="bg-white rounded-2xl p-4 flex gap-4 items-start">
                  <img
                    src={api.getImageUrl(item.image)}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-xl shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-black text-lg leading-tight mb-1 truncate">{item.name}</p>
                    <p className="text-primary font-semibold">{fmt(item.priceNumeric)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Hapus
                    </button>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1">
                      <button
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        className="w-5 h-5 flex items-center justify-center text-black font-bold"
                      >
                        −
                      </button>
                      <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        className="w-5 h-5 flex items-center justify-center text-black font-bold"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm text-black/60">{fmt(item.priceNumeric * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:w-80 shrink-0">
              <div className="bg-white rounded-2xl p-6 sticky top-24">
                <h2 className="text-lg font-bold text-black mb-4">Ringkasan Pesanan</h2>
                <div className="flex justify-between text-sm text-black/70 mb-2">
                  <span>Subtotal ({cart.reduce((s, c) => s + c.quantity, 0)} item)</span>
                  <span>{fmt(getCartTotal())}</span>
                </div>
                <div className="flex justify-between text-sm text-black/60 mb-4">
                  <span>Ongkir</span>
                  <span>Dihitung saat checkout</span>
                </div>
                <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-black mb-6">
                  <span>Total</span>
                  <span>{fmt(getCartTotal())}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  Lanjut ke Checkout
                </button>
                <Link to="/produk" className="block text-center text-sm text-black/60 mt-4 hover:text-black">
                  Lanjut Belanja
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
