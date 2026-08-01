import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
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
      <span className="w-5 h-5 flex items-center justify-center bg-[#1E1E1E] shrink-0">
        <Check className="size-3 text-white" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className="w-5 h-5 flex items-center justify-center text-[11px] shrink-0 border border-[#E9E9EA] text-[#6F6F71]">
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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="grow">
        <div className="border-b border-[#E9E9EA] py-6">
          <h1 className="text-center text-2xl md:text-3xl">Checkout</h1>
        </div>

        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-10">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Left — form */}
            <div className="flex-1 space-y-8">
              {(!cartHydrated || cartSyncing) && (
                <div className="border border-[#E9E9EA] px-4 py-3 text-[13px] text-[#6F6F71]">
                  Memperbarui harga, promo, dan data pengiriman terbaru...
                </div>
              )}
              {cartSyncError && (
                <div className="flex flex-col gap-2 border border-[#E9E9EA] px-4 py-3 text-[13px] text-[#AE4B4B]">
                  <p>{cartSyncError}</p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={refreshCart}
                      className="uppercase tracking-[0.12em] text-[12px] underline underline-offset-2 cursor-pointer"
                    >
                      Coba lagi
                    </button>
                    <button
                      onClick={() => navigate('/keranjang')}
                      className="uppercase tracking-[0.12em] text-[12px] underline underline-offset-2 cursor-pointer"
                    >
                      Kembali ke keranjang
                    </button>
                  </div>
                </div>
              )}

              {/* Step 1: Address */}
              <div className="border-b border-[#E9E9EA] pb-8">
                <div className="flex items-center gap-2.5 mb-4">
                  <StepBadge number={1} done={!!selectedAddress} />
                  <h2 className="uppercase text-[13px] tracking-[0.12em] text-[#1E1E1E]">Alamat Pengiriman</h2>
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
                  <div className="mt-3 border border-[#E9E9EA] px-4 py-3 text-[13px] text-[#1E1E1E]">
                    <p>{selectedAddress.recipientName} · {selectedAddress.phone}</p>
                    <p className="text-[13px] text-[#6F6F71] mt-0.5">{selectedAddress.street}, {selectedAddress.areaName}</p>
                  </div>
                )}
              </div>

              {/* Step 2: Shipping */}
              {selectedAddress && (
                <div className="border-b border-[#E9E9EA] pb-8">
                  <div className="flex items-center gap-2.5 mb-4">
                    <StepBadge number={2} done={!!selectedRate} />
                    <h2 className="uppercase text-[13px] tracking-[0.12em] text-[#1E1E1E]">Metode Pengiriman</h2>
                  </div>
                  {!cartHydrated || cartSyncing ? (
                    <p className="text-[13px] text-[#6F6F71]">Menyiapkan data pengiriman terbaru...</p>
                  ) : cartSyncError ? (
                    <p className="text-[13px] text-[#AE4B4B]">
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
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <StepBadge number={3} done={!!appliedVoucher} />
                    <h2 className="uppercase text-[13px] tracking-[0.12em] text-[#1E1E1E]">Kode Voucher</h2>
                    <span className="text-[13px] text-[#6F6F71]">(opsional)</span>
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
              <div className="sticky top-24">
                <p className="uppercase tracking-[0.12em] text-[11px] text-[#6F6F71] mb-4">Ringkasan Pesanan</p>

                <div className="mb-4">
                  {effectiveCart.map((c) => (
                    <div key={c.cartItemId} className="flex items-center gap-3 py-2.5 border-b border-[#E9E9EA] last:border-b-0">
                      <div className="w-10 h-10 bg-[#F9F7F2] shrink-0 overflow-hidden">
                        {c.image ? (
                          <img
                            src={api.getImageUrl(c.image)}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#F9F7F2]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="uppercase text-[12px] text-[#1E1E1E] truncate leading-tight">{c.name}</p>
                        {c.variantName && (
                          <p className="text-[12px] text-[#6F6F71] truncate">{c.variantName}</p>
                        )}
                        <p className="text-[12px] text-[#6F6F71]">×{c.quantity}</p>
                      </div>
                      <span className="text-[13px] text-[#1E1E1E] shrink-0 tabular-nums">
                        {cartReady ? fmt(c.priceNumeric * c.quantity) : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#E9E9EA] pt-4 space-y-2 text-[13px] text-[#6F6F71]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{cartReady ? fmt(subtotal) : '—'}</span>
                  </div>
                  {cartReady && voucherDiscount > 0 && (
                    <div className="flex justify-between">
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

                <div className="border-t border-[#E9E9EA] mt-3 pt-3 flex justify-between text-[13px] text-[#1E1E1E] mb-6">
                  <span>Total</span>
                  <span className="tabular-nums">{cartReady ? fmt(total) : '—'}</span>
                </div>

                <button
                  onClick={handlePay}
                  disabled={!selectedAddress || !selectedRate || paying || cartSyncing || !cartReady}
                  className="w-full bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {!cartHydrated || cartSyncing ? 'Sinkronisasi...' : paying ? 'Memproses...' : 'Bayar Sekarang'}
                </button>

                {(!selectedAddress || !selectedRate || !cartReady) && (
                  <p className="text-center text-[13px] text-[#6F6F71] mt-3">
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
    </div>
  );
}
