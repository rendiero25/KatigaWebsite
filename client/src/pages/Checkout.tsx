import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import type { CartItem, ShippingAddress, ShippingRate, VoucherValidation } from '../types/ecommerce';
import { useLiveCart } from '../hooks/useApi';
import { getCart, removeManyFromCart, normalizeCartItem } from '../utils/cart';
import api from '../services/api';
import AddressSelector from '../components/AddressSelector';
import ShippingSelector from '../components/ShippingSelector';
import VoucherInput from '../components/VoucherInput';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface LocationState {
  selectedIds?: string[];
  buyNowItem?: CartItem;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const CHECKOUT_SELECTED_IDS_KEY = 'kk_checkout_selected_ids';
const BUY_NOW_ITEM_KEY = 'kk_buy_now_item';

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

const getStoredBuyNowItem = (): CartItem | null => {
  try {
    const raw = sessionStorage.getItem(BUY_NOW_ITEM_KEY);
    return raw ? normalizeCartItem(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

interface StepBadgeProps {
  number: number;
  done: boolean;
}

function StepBadge({ number, done }: StepBadgeProps) {
  if (done) {
    return (
      <span className="w-6 h-6 rounded-full flex items-center justify-center bg-primary shrink-0">
        <CheckCircle2 className="size-4 text-white" />
      </span>
    );
  }
  return (
    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-[#E8E8E5] text-[#9A9A9A]">
      {number}
    </span>
  );
}

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

    const state = location.state as LocationState | null;
    const buyNowItem = state ? state.buyNowItem : getStoredBuyNowItem();

    if (buyNowItem) {
      sessionStorage.setItem(BUY_NOW_ITEM_KEY, JSON.stringify(buyNowItem));
      sessionStorage.removeItem(CHECKOUT_SELECTED_IDS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCart([buyNowItem]);
      return;
    }

    sessionStorage.removeItem(BUY_NOW_ITEM_KEY);

    const allCart = getCart();
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

  const handleRateSelect = useCallback((rate: ShippingRate | null) => {
    setSelectedRate(rate);
    if (!rate) {
      setAppliedVoucher(null);
      setVoucherCode('');
    }
  }, []);

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
        toast.error(result.message ?? 'Gagal membuat pesanan');
        setPaying(false);
        return;
      }

      if (!window.snap) {
        toast.error('Sistem pembayaran belum siap. Refresh halaman dan coba lagi.');
        setPaying(false);
        return;
      }

      const purchasedCartItemIds = effectiveCart.map((item) => item.cartItemId);
      const removePurchasedItems = () => removeManyFromCart(purchasedCartItemIds);
      const clearCheckoutSelection = () => {
        sessionStorage.removeItem(CHECKOUT_SELECTED_IDS_KEY);
        sessionStorage.removeItem(BUY_NOW_ITEM_KEY);
      };

      window.snap.pay(result.snapToken, {
        onSuccess:  () => {
          removePurchasedItems();
          clearCheckoutSelection();
          navigate(`/pesanan/${result.orderId}`, { state: { fromPayment: true } });
        },
        onPending:  () => {
          removePurchasedItems();
          clearCheckoutSelection();
          navigate(`/pesanan/${result.orderId}`, { state: { fromPayment: true } });
        },
        onError:    () => { toast.error('Pembayaran gagal, silakan coba lagi.'); setPaying(false); },
        onClose:    () => {
          clearCheckoutSelection();
          navigate(`/pesanan/${result.orderId}`);
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan, coba lagi.');
      setPaying(false);
    }
  }, [effectiveCart, selectedAddress, selectedRate, voucherDiscount, voucherCode, navigate, cartSyncing, cartReady]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F9F7F2] pt-24 pb-20">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <h1 className="text-2xl font-semibold text-[#1F1F1F] mb-8">Checkout</h1>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left — form */}
            <div className="flex-1 space-y-4">
              {(!cartHydrated || cartSyncing) && (
                <div className="rounded-lg border border-[#D4DEFF] bg-[#F0F5FF] px-4 py-3 text-sm text-primary">
                  Memperbarui harga, promo, dan data pengiriman terbaru...
                </div>
              )}
              {cartSyncError && (
                <div className="flex flex-col gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
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

              {/* Step 1: Address */}
              <div className="bg-white border border-[#E8E8E5] rounded-xl p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <StepBadge number={1} done={!!selectedAddress} />
                  <h2 className="text-sm font-semibold text-[#1F1F1F] uppercase tracking-wide">Alamat Pengiriman</h2>
                </div>
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
                  <div className="mt-3 p-3 bg-[#F0F5FF] border border-[#D4DEFF] rounded-lg text-sm text-primary">
                    <p className="font-semibold">{selectedAddress.recipientName} · {selectedAddress.phone}</p>
                    <p className="text-xs text-primary/70 mt-0.5">{selectedAddress.street}, {selectedAddress.areaName}</p>
                  </div>
                )}
              </div>

              {/* Step 2: Shipping */}
              {selectedAddress && (
                <div className="bg-white border border-[#E8E8E5] rounded-xl p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <StepBadge number={2} done={!!selectedRate} />
                    <h2 className="text-sm font-semibold text-[#1F1F1F] uppercase tracking-wide">Metode Pengiriman</h2>
                  </div>
                  {!cartHydrated || cartSyncing ? (
                    <p className="text-sm text-[#9A9A9A]">Menyiapkan data pengiriman terbaru...</p>
                  ) : cartSyncError ? (
                    <p className="text-sm text-red-600">
                      Sinkronkan keranjang dulu sebelum memilih pengiriman.
                    </p>
                  ) : (
                    <ShippingSelector
                      address={selectedAddress}
                      cart={effectiveCart}
                      onSelect={handleRateSelect}
                    />
                  )}
                </div>
              )}

              {/* Step 3: Voucher */}
              {selectedRate && cartReady && (
                <div className="bg-white border border-[#E8E8E5] rounded-xl p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <StepBadge number={3} done={!!appliedVoucher} />
                    <h2 className="text-sm font-semibold text-[#1F1F1F] uppercase tracking-wide">Kode Voucher</h2>
                    <span className="text-xs text-[#9A9A9A] ml-1">(opsional)</span>
                  </div>
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
              <div className="bg-primary rounded-xl p-6 sticky top-24">
                <h2 className="text-base font-semibold text-white mb-4">Ringkasan Pesanan</h2>

                <div className="space-y-3 mb-4">
                  {effectiveCart.map((c) => (
                    <div key={c.cartItemId} className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-white/10 shrink-0">
                        {c.image ? (
                          <img
                            src={api.getImageUrl(c.image)}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/10" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/90 truncate leading-tight">{c.name}</p>
                        {c.variantName && (
                          <p className="text-[11px] text-white/50 truncate">{c.variantName}</p>
                        )}
                        <p className="text-[11px] text-white/50">×{c.quantity}</p>
                      </div>
                      <span className="text-sm text-white/70 shrink-0 tabular-nums">
                        {cartReady ? fmt(c.priceNumeric * c.quantity) : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/15 pt-3 space-y-2 text-sm text-white/70">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{cartReady ? fmt(subtotal) : '—'}</span>
                  </div>
                  {cartReady && voucherDiscount > 0 && (
                    <div className="flex justify-between text-green-300">
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

                <div className="border-t border-white/15 mt-3 pt-3 flex justify-between font-semibold text-white mb-5">
                  <span>Total</span>
                  <span className="tabular-nums">{cartReady ? fmt(total) : '—'}</span>
                </div>

                <button
                  onClick={handlePay}
                  disabled={!selectedAddress || !selectedRate || paying || cartSyncing || !cartReady}
                  className="w-full py-3 bg-white text-primary font-semibold rounded-md text-sm hover:bg-[#F7F9FF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {!cartHydrated || cartSyncing ? 'Sinkronisasi...' : paying ? 'Memproses...' : 'Bayar Sekarang'}
                </button>

                {(!selectedAddress || !selectedRate || !cartReady) && (
                  <p className="text-center text-xs text-white/50 mt-3">
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
