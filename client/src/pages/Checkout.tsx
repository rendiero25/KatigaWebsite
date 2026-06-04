import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CartItem, ShippingAddress, ShippingRate, BiteshipArea } from '../types/ecommerce';
import { getCart, clearCart, getCartTotal } from '../utils/cart';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const emptyAddress: ShippingAddress = {
  recipientName: '', phone: '', street: '', city: '', province: '', postalCode: '', areaId: '', areaName: '',
};

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState<ShippingAddress>(emptyAddress);
  const [areaKeyword, setAreaKeyword] = useState('');
  const [areaResults, setAreaResults] = useState<BiteshipArea[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [paying, setPaying] = useState(false);
  const [step, setStep] = useState<'address' | 'shipping' | 'payment'>('address');

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (!token) { navigate('/masuk?redirect=/checkout'); return; }
    const c = getCart();
    if (!c.length) { navigate('/keranjang'); return; }
    setCart(c);

    // Pre-fill address from profile
    api.getCustomerProfile().then((profile) => {
      if (profile?.defaultAddress?.areaId) {
        setAddress(profile.defaultAddress);
        setAreaKeyword(profile.defaultAddress.areaName ?? '');
      }
    }).catch(() => {});
  }, [navigate]);

  // Debounced area search
  useEffect(() => {
    if (areaKeyword.length < 3) { setAreaResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchAreas(areaKeyword);
        setAreaResults(Array.isArray(results) ? results : []);
      } catch { setAreaResults([]); }
    }, 500);
    return () => clearTimeout(timer);
  }, [areaKeyword]);

  const fetchRates = useCallback(async () => {
    if (!address.areaId || !cart.length) return;
    setLoadingRates(true);
    setRates([]);
    setSelectedRate(null);
    try {
      const items = cart.map((c) => ({
        name: c.name,
        priceNumeric: c.priceNumeric,
        weightGrams: c.weightGrams,
        quantity: c.quantity,
        dimensions: { length: 1, width: 1, height: 1 },
      }));
      const result = await api.getShippingRates({ destinationAreaId: address.areaId, items });
      setRates(Array.isArray(result) ? result : []);
    } catch { setRates([]); }
    finally { setLoadingRates(false); }
  }, [address.areaId, cart]);

  const handlePay = async () => {
    if (!selectedRate) return;
    setPaying(true);
    try {
      const payload = {
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        shippingAddress: address,
        shippingCourier: selectedRate.courier_code,
        shippingService: selectedRate.courier_service_code,
        shippingServiceName: `${selectedRate.courier_name} ${selectedRate.courier_service_name}`,
        shippingCost: selectedRate.price,
        estimatedDays: selectedRate.duration,
      };
      const result = await api.createOrder(payload);
      if (!result.snapToken) { alert(result.message || 'Gagal membuat pesanan'); setPaying(false); return; }

      clearCart();

      window.snap.pay(result.snapToken, {
        onSuccess: () => navigate(`/pesanan/${result.orderId}`),
        onPending: () => navigate(`/pesanan/${result.orderId}`),
        onError: () => { alert('Pembayaran gagal, silakan coba lagi.'); setPaying(false); },
        onClose: () => { navigate(`/pesanan/${result.orderId}`); },
      });
    } catch (err) {
      alert('Terjadi kesalahan, coba lagi.');
      setPaying(false);
    }
  };

  const subtotal = getCartTotal();
  const total = subtotal + (selectedRate?.price ?? 0);

  const setAddr = (field: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress((a) => ({ ...a, [field]: e.target.value }));

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F9F7F2] pt-10 pb-20">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <h1 className="text-3xl font-bold text-black mb-8">Checkout</h1>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left — form */}
            <div className="flex-1 space-y-6">

              {/* Address */}
              <div className="bg-white rounded-2xl p-6">
                <h2 className="text-lg font-bold text-black mb-4">Alamat Pengiriman</h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nama penerima"
                    value={address.recipientName}
                    onChange={setAddr('recipientName')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="tel"
                    placeholder="Nomor HP penerima"
                    value={address.phone}
                    onChange={setAddr('phone')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="Alamat lengkap (nama jalan, nomor, RT/RW)"
                    value={address.street}
                    onChange={setAddr('street')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />

                  {/* Area search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari kecamatan / kota (min. 3 huruf)"
                      value={areaKeyword}
                      onChange={(e) => { setAreaKeyword(e.target.value); setAddress((a) => ({ ...a, areaId: '', areaName: '' })); }}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {areaResults.length > 0 && (
                      <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                        {areaResults.map((area) => (
                          <li
                            key={area.area_id}
                            className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm"
                            onClick={() => {
                              const label = `${area.administrative_division_level_3_name}, ${area.administrative_division_level_2_name}, ${area.administrative_division_level_1_name}`;
                              setAddress((a) => ({
                                ...a,
                                areaId: area.area_id,
                                areaName: label,
                                city: area.administrative_division_level_2_name,
                                province: area.administrative_division_level_1_name,
                                postalCode: area.postal_code,
                              }));
                              setAreaKeyword(label);
                              setAreaResults([]);
                            }}
                          >
                            {area.administrative_division_level_3_name}, {area.administrative_division_level_2_name}, {area.administrative_division_level_1_name} {area.postal_code}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {address.areaId && (
                    <button
                      onClick={() => { fetchRates(); setStep('shipping'); }}
                      className="w-full py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full transition hover:shadow-lg"
                    >
                      Cek Ongkir
                    </button>
                  )}
                </div>
              </div>

              {/* Shipping rates */}
              {(step === 'shipping' || step === 'payment') && (
                <div className="bg-white rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-black mb-4">Pilih Pengiriman</h2>
                  {loadingRates ? (
                    <p className="text-sm text-black/60">Mengambil tarif...</p>
                  ) : rates.length === 0 ? (
                    <p className="text-sm text-black/60">Tidak ada kurir tersedia untuk tujuan ini.</p>
                  ) : (
                    <div className="space-y-2">
                      {rates.map((rate, i) => (
                        <label
                          key={i}
                          className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${selectedRate === rate ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="rate"
                              checked={selectedRate === rate}
                              onChange={() => { setSelectedRate(rate); setStep('payment'); }}
                              className="accent-primary"
                            />
                            <div>
                              <p className="font-medium text-sm text-black">{rate.courier_name} — {rate.courier_service_name}</p>
                              <p className="text-xs text-black/60">{rate.duration}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-black">{fmt(rate.price)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right — summary */}
            <div className="lg:w-80 shrink-0">
              <div className="bg-white rounded-2xl p-6 sticky top-24">
                <h2 className="text-lg font-bold text-black mb-4">Ringkasan</h2>

                <div className="space-y-2 mb-4">
                  {cart.map((c) => (
                    <div key={c.productId} className="flex justify-between text-sm text-black/70">
                      <span className="truncate max-w-[160px]">{c.name} ×{c.quantity}</span>
                      <span>{fmt(c.priceNumeric * c.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm text-black/70">
                  <div className="flex justify-between">
                    <span>Subtotal</span><span>{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ongkir</span>
                    <span>{selectedRate ? fmt(selectedRate.price) : '—'}</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold text-black mb-6">
                  <span>Total</span><span>{fmt(total)}</span>
                </div>

                <button
                  onClick={handlePay}
                  disabled={!selectedRate || paying}
                  className="w-full py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paying ? 'Memproses...' : 'Bayar Sekarang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
