import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMinus, FiPlus, FiX } from 'react-icons/fi';

import api from '../services/api';
import { getCart, removeFromCart, updateQty } from '../utils/cart';
import type { CartItem } from '../types/ecommerce';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(getCart());
    sync();

    const open = () => {
      sync();
      setIsOpen(true);
    };

    window.addEventListener('cartUpdated', sync);
    window.addEventListener('cartDrawerOpen', open);
    return () => {
      window.removeEventListener('cartUpdated', sync);
      window.removeEventListener('cartDrawerOpen', open);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const subtotal = items.reduce((sum, item) => sum + item.priceNumeric * item.quantity, 0);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      <div className="absolute inset-0 bg-black/20" onClick={() => setIsOpen(false)} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keranjang"
        className={`absolute inset-y-0 right-0 w-[85%] max-w-md bg-white flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-20 px-5 border-b border-[#E9E9EA] shrink-0">
          <span className="uppercase tracking-[0.12em] text-[13px] text-[#1E1E1E]">
            Keranjang {totalQty > 0 && `(${totalQty})`}
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup keranjang"
            className="text-xl text-[#1E1E1E] cursor-pointer"
          >
            <FiX />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
            <p className="text-sm text-[#6F6F71]">Keranjang kamu masih kosong.</p>
            <Link
              to="/produk"
              onClick={() => setIsOpen(false)}
              className="border border-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition"
            >
              Lihat Produk
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex gap-4 py-5 border-b border-[#E9E9EA] last:border-b-0"
                >
                  <Link
                    to={`/produk/${item.productId}`}
                    onClick={() => setIsOpen(false)}
                    className="w-20 h-20 shrink-0 bg-[#F9F7F2] overflow-hidden"
                  >
                    <img
                      src={api.getImageUrl(item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/produk/${item.productId}`}
                      onClick={() => setIsOpen(false)}
                      className="uppercase text-[13px] text-[#1E1E1E] hover:underline"
                    >
                      {item.name}
                    </Link>

                    <p className="text-[13px] text-[#6F6F71] mt-1">{fmt(item.priceNumeric)}</p>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-[#E9E9EA]">
                        <button
                          type="button"
                          onClick={() => updateQty(item.cartItemId, item.quantity - 1)}
                          aria-label={`Kurangi jumlah ${item.name}`}
                          className="px-2.5 py-1.5 text-[#6F6F71] hover:text-[#1E1E1E] cursor-pointer"
                        >
                          <FiMinus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-[13px] text-[#1E1E1E]">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.cartItemId, item.quantity + 1)}
                          aria-label={`Tambah jumlah ${item.name}`}
                          className="px-2.5 py-1.5 text-[#6F6F71] hover:text-[#1E1E1E] cursor-pointer"
                        >
                          <FiPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="uppercase tracking-[0.12em] text-[11px] text-[#6F6F71] hover:text-[#1E1E1E] underline underline-offset-2 cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t border-[#E9E9EA] px-5 py-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-[0.12em] text-[13px] text-[#6F6F71]">
                  Subtotal
                </span>
                <span className="text-[13px] text-[#1E1E1E]">{fmt(subtotal)}</span>
              </div>

              <p className="text-[13px] text-[#6F6F71]">
                Ongkos kirim dihitung saat checkout.
              </p>

              <Link
                to="/checkout"
                onClick={() => setIsOpen(false)}
                className="bg-[#4F68AF] text-white text-center uppercase tracking-[0.18em] text-[13px] px-6 py-4 hover:bg-[#2B3A67] transition"
              >
                Checkout
              </Link>
              <Link
                to="/keranjang"
                onClick={() => setIsOpen(false)}
                className="border border-[#1E1E1E] text-center uppercase tracking-[0.18em] text-[13px] px-6 py-4 hover:bg-[#1E1E1E] hover:text-white transition"
              >
                Lihat Keranjang
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
