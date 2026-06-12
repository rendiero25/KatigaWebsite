import { useState, useEffect, useCallback } from 'react';
import type { ShippingAddress, ShippingRate, CartItem } from '../types/ecommerce';
import api from '../services/api';

interface Props {
  address: ShippingAddress;
  cart: CartItem[];
  onSelect: (rate: ShippingRate | null) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function ShippingSelector({ address, cart, onSelect }: Props) {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selected, setSelected] = useState<ShippingRate | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRates = useCallback(async () => {
    if (!address.areaId || !cart.length) return;
    setLoading(true);
    setRates([]);
    setSelected(null);
    onSelect(null);
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
    } catch {
      setRates([]);
    } finally {
      setLoading(false);
    }
  }, [address.areaId, cart]);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const handleSelect = (rate: ShippingRate) => {
    setSelected(rate);
    onSelect(rate);
  };

  if (loading) {
    return <p className="text-sm text-black/60 py-2">Mengambil tarif pengiriman...</p>;
  }

  if (!rates.length) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-black/60">Tidak ada kurir tersedia untuk tujuan ini.</p>
        <button
          onClick={fetchRates}
          className="text-sm text-primary hover:underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rates.map((rate, i) => (
        <label
          key={i}
          className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${selected === rate ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="shippingRate"
              checked={selected === rate}
              onChange={() => handleSelect(rate)}
              className="accent-primary"
            />
            <div>
              <p className="font-medium text-sm text-black">
                {rate.courier_name} — {rate.courier_service_name}
              </p>
              <p className="text-xs text-black/60">{rate.duration}</p>
            </div>
          </div>
          <span className="text-sm font-bold text-black shrink-0">{fmt(rate.price)}</span>
        </label>
      ))}
    </div>
  );
}
