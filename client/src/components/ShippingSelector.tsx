import { useState, useEffect, useCallback, useRef } from 'react';
import type { ShippingAddress, ShippingRate, CartItem } from '../types/ecommerce';
import api from '../services/api';
import { getCourierLogoUrl } from '../utils/courierLogos';

interface Props {
  address: ShippingAddress;
  cart: CartItem[];
  onSelect: (rate: ShippingRate | null) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);

export default function ShippingSelector({ address, cart, onSelect }: Props) {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selected, setSelected] = useState<ShippingRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [emptyReason, setEmptyReason] = useState<'provider_empty' | 'filtered_out' | null>(null);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);

  const fetchRates = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setRates([]);
    setSelected(null);
    setEmptyReason(null);
    setEmptyMessage('');
    setErrorMessage(null);
    onSelect(null);

    if (!address.areaId || !cart.length) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const items = cart.map((c) => ({
        name: c.name,
        priceNumeric: c.priceNumeric,
        weightGrams: c.weightGrams,
        quantity: c.quantity,
        dimensions: c.dimensions,
      }));

      const result = await api.getShippingRates({
        destinationAreaId: address.areaId,
        items,
      });

      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setRates(Array.isArray(result.rates) ? result.rates : []);

      if (result.reason !== 'ok') {
        setEmptyReason(result.reason);
        setEmptyMessage(result.message);
      }
    } catch (err) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal mengambil metode pengiriman. Coba lagi.'
      );
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [address.areaId, cart, onSelect]);

  useEffect(() => {
    return () => {
      latestRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(null);
  }, [address]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRates();
  }, [fetchRates]);

  const handleSelect = (rate: ShippingRate) => {
    setSelected(rate);
    onSelect(rate);
  };

  if (loading) {
    return <p className="text-[13px] text-[#6F6F71] py-2">Mengambil tarif pengiriman...</p>;
  }

  if (errorMessage) {
    return (
      <div className="space-y-2">
        <p className="text-[13px] text-[#AE4B4B]">{errorMessage}</p>
        <button
          onClick={fetchRates}
          className="text-[13px] text-[#1E1E1E] underline underline-offset-2 cursor-pointer"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!rates.length && emptyReason) {
    return (
      <div className="space-y-2">
        <p className="text-[13px] text-[#6F6F71]">{emptyMessage}</p>
        {emptyReason === 'provider_empty' && (
          <button
            onClick={fetchRates}
            className="text-[13px] text-[#1E1E1E] underline underline-offset-2 cursor-pointer"
          >
            Coba lagi
          </button>
        )}
      </div>
    );
  }

  if (!rates.length) {
    return (
      <div className="space-y-2">
        <p className="text-[13px] text-[#6F6F71]">Tidak ada kurir tersedia untuk tujuan ini.</p>
        <button
          onClick={fetchRates}
          className="text-[13px] text-[#1E1E1E] underline underline-offset-2 cursor-pointer"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="max-h-[372px] overflow-y-auto pr-1">
      {rates.map((rate, i) => {
        const logo = getCourierLogoUrl(rate.courier_code);
        const isSelected =
          selected?.courier_code === rate.courier_code &&
          selected?.courier_service_code === rate.courier_service_code;
        return (
          <label
            key={`${rate.courier_code}-${rate.courier_service_code}-${i}`}
            className={`flex items-center justify-between gap-4 px-3 py-3 border-b border-[#E9E9EA] cursor-pointer transition-colors last:border-b-0 ${
              isSelected ? 'bg-[#F9F7F2]' : 'hover:bg-[#F9F7F2]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <input
                type="radio"
                name="shippingRate"
                checked={isSelected}
                onChange={() => handleSelect(rate)}
                className="accent-[#1E1E1E] shrink-0"
              />
              {logo && (
                <img
                  src={logo}
                  alt={rate.courier_name}
                  className="h-7 w-7 object-contain shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-[13px] text-[#1E1E1E] truncate">
                  {rate.courier_name} — {rate.courier_service_name}
                </p>
                <p className="text-[13px] text-[#6F6F71]">{rate.duration}</p>
              </div>
            </div>
            <span className="text-[13px] text-[#1E1E1E] shrink-0 tabular-nums">{fmt(rate.price)}</span>
          </label>
        );
      })}
    </div>
  );
}
