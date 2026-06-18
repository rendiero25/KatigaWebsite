import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { CartItem, ShippingAddress, ShippingRate, VoucherValidation } from '../types/ecommerce';
import { useLiveCart } from '../hooks/useApi';
import { getCart, removeManyFromCart } from '../utils/cart';
import api from '../services/api';
import AddressSelector from '../components/AddressSelector';
import ShippingSelector from '../components/ShippingSelector';
import VoucherInput from '../components/VoucherInput';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface LocationState {
  selectedIds?: string[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const CHECKOUT_SELECTED_IDS_KEY = 'kk_checkout_selected_ids';

const getStoredSelectedIds = (): string[] => {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_SELECTED_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
};

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherValidation | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [paying, setPaying] = useState(false);
  const {
    data: liveCart,
    loading: cartSyncing,
    error: cartSyncError,
    refresh: refreshCart,
    hydrated: cartHydrated,
    issuesByCartItemId,
  } = useLiveCart(cart);

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (!token) { navigate('/masuk?redirect=/checkout'); return; }

    const allCart = getCart();
    const state = location.state as LocationState | null;
    const selectedIds = state?.selectedIds?.length ? state.selectedIds : getStoredSelectedIds();

    if (!selectedIds.length) {
      navigate('/keranjang');
      return;
    }

    sessionStorage.setItem(CHECKOUT_SELECTED_IDS_KEY, JSON.stringify(selectedIds));

    const filtered = allCart.filter((c) => selectedIds.includes(c.cartItemId));

    if (!filtered.length) {
      sessionStorage.removeItem(CHECKOUT_SELECTED_IDS_KEY);
      navigate('/keranjang');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(filtered);
  }, [navigate, location.state]);

  const effectiveCart = liveCart;
  const hasCartSyncIssues = effectiveCart.some((item) => Boolean(issuesByCartItemId[item.cartItemId]));
  const cartReady = cartHydrated && !hasCartSyncIssues;
  const cartPricingKey = effectiveCart
    .map((item) =>
      [
        item.cartItemId,
        item.quantity,
        item.priceNumeric,
        item.weightGrams,
        item.dimensions.length,
        item.dimensions.width,
        item.dimensions.height,
      ].join(':')
    )
    .join('|');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedRate(null);
    setAppliedVoucher(null);
    setVoucherCode('');
  }, [cartPricingKey]);

  const subtotal = effectiveCart.reduce((s, c) => s + c.priceNumeric * c.quantity, 0);
  const voucherDiscount = appliedVoucher?.discountAmount ?? 0;
  const shippingCost = selectedRate?.price ?? 0;
  const total = subtotal - voucherDiscount + shippingCost;

  const handlePay = useCallback(async () => {
    if (!selectedAddress || !selectedRate || cartSyncing || !cartReady) return;
    setPaying(true);
    try {
      const result = await api.createOrder({
        items: effectiveCart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          variantId: c.variantId,
        })),
        shippingAddress: selectedAddress,
        shippingCourier: selectedRate.courier_code,
        shippingService: selectedRate.courier_service_code,
        shippingServiceName: `${selectedRate.courier_name} ${selectedRate.courier_service_name}`,
        shippingCost: selectedRate.price,
        estimatedDays: selectedRate.duration,
        voucherCode: voucherCode || undefined,
        voucherDiscount: voucherDiscount > 0 ? voucherDiscount : undefined,
      });

      if (!result.snapToken) {
        alert(result.message ?? 'Gagal membuat pesanan');
        setPaying(false);
        return;
      }

      const purchasedCartItemIds = effectiveCart.map((item) => item.cartItemId);
      const removePurchasedItems = () => removeManyFromCart(purchasedCartItemIds);
      const clearCheckoutSelection = () => sessionStorage.removeItem(CHECKOUT_SELECTED_IDS_KEY);

      window.snap.pay(result.snapToken, {
        onSuccess:  () => {
          removePurchasedItems();
          clearCheckoutSelection();
          navigate(`/pesanan/${result.orderId}`);
        },
        onPending:  () => {
          removePurchasedItems();
          clearCheckoutSelection();
          navigate(`/pesanan/${result.orderId}`);
        },
        onError:    () => { alert('Pembayaran gagal, silakan coba lagi.'); setPaying(false); },
        onClose:    () => {
          clearCheckoutSelection();
          navigate(`/pesanan/${result.orderId}`);
        },
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan, coba lagi.');
      setPaying(false);
    }
  }, [effectiveCart, selectedAddress, selectedRate, voucherDiscount, voucherCode, navigate, cartSyncing, cartReady]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white pt-10 pb-20">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <h1 className="text-3xl font-bold text-black mb-8">Checkout</h1>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left — form */}
            <div className="flex-1 space-y-6">
              {(!cartHydrated || cartSyncing) && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Memperbarui harga, promo, dan data pengiriman terbaru...
                </div>
              )}
              {cartSyncError && (
                <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p>{cartSyncError}</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={refreshCart}
                      className="font-medium text-red-700 hover:underline"
                    >
                      Coba lagi
                    </button>
                    <button
                      onClick={() => navigate('/keranjang')}
                      className="font-medium text-red-700 hover:underline"
                    >
                      Kembali ke keranjang
                    </button>
                  </div>
                </div>
              )}

              {/* Address */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h2 className="text-base font-bold text-black mb-4">Alamat Pengiriman</h2>
                <AddressSelector
                  selected={selectedAddress}
                  onSelect={(addr) => {
                    setSelectedAddress(addr);
                    setSelectedRate(null);
                    setAppliedVoucher(null);
                    setVoucherCode('');
                  }}
                />
                {selectedAddress && (
                  <div className="mt-3 p-3 bg-green-50 rounded-xl text-sm text-green-800">
                    <p className="font-semibold">{selectedAddress.recipientName} · {selectedAddress.phone}</p>
                    <p className="text-xs text-green-700 mt-0.5">{selectedAddress.street}, {selectedAddress.areaName}</p>
                  </div>
                )}
              </div>

              {/* Shipping */}
              {selectedAddress && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                  <h2 className="text-base font-bold text-black mb-4">Pilih Pengiriman</h2>
                  {!cartHydrated || cartSyncing ? (
                    <p className="text-sm text-black/60">Menyiapkan data pengiriman terbaru...</p>
                  ) : cartSyncError ? (
                    <p className="text-sm text-red-600">
                      Sinkronkan keranjang dulu sebelum memilih pengiriman.
                    </p>
                  ) : (
                    <ShippingSelector
                      address={selectedAddress}
                      cart={effectiveCart}
                      onSelect={(rate) => {
                        setSelectedRate(rate);
                        if (!rate) {
                          setAppliedVoucher(null);
                          setVoucherCode('');
                        }
                      }}
                    />
                  )}
                </div>
              )}

              {/* Voucher */}
              {selectedRate && cartReady && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                  <h2 className="text-base font-bold text-black mb-4">Kode Voucher</h2>
                  <VoucherInput
                    subtotal={subtotal}
                    onApply={(v, code) => { setAppliedVoucher(v); setVoucherCode(code); }}
                    onClear={() => { setAppliedVoucher(null); setVoucherCode(''); }}
                  />
                </div>
              )}
            </div>

            {/* Right — summary */}
            <div className="lg:w-80 shrink-0">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 sticky top-24">
                <h2 className="text-base font-bold text-black mb-4">Ringkasan Pesanan</h2>

                {/* Items */}
                <div className="space-y-2 mb-4">
                  {effectiveCart.map((c) => (
                    <div key={c.cartItemId} className="flex justify-between text-sm text-black/70">
                      <span className="truncate max-w-[160px]">{c.name} ×{c.quantity}</span>
                      <span className="shrink-0 tabular-nums">
                        {cartReady ? fmt(c.priceNumeric * c.quantity) : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm text-black/70">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{cartReady ? fmt(subtotal) : '—'}</span>
                  </div>
                  {cartReady && voucherDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Diskon voucher</span>
                      <span className="tabular-nums">− {fmt(voucherDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Ongkir</span>
                    <span className="tabular-nums">
                      {cartReady && selectedRate ? fmt(selectedRate.price) : '—'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold text-black mb-6">
                  <span>Total</span>
                  <span className="tabular-nums">{cartReady ? fmt(total) : '—'}</span>
                </div>

                <button
                  onClick={handlePay}
                  disabled={!selectedAddress || !selectedRate || paying || cartSyncing || !cartReady}
                  className="w-full py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 text-sm"
                >
                  {!cartHydrated || cartSyncing ? 'Sinkronisasi...' : paying ? 'Memproses...' : 'Bayar Sekarang'}
                </button>

                {(!selectedAddress || !selectedRate || !cartReady) && (
                  <p className="text-center text-xs text-black/40 mt-3">
                    {!selectedAddress
                      ? 'Pilih alamat pengiriman terlebih dahulu'
                      : !cartReady
                        ? 'Sinkronkan keranjang dulu sebelum lanjut bayar'
                        : 'Pilih metode pengiriman terlebih dahulu'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
