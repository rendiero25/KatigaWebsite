import { useState, useEffect, useCallback, useRef } from 'react';
import type { ShippingAddress, ShippingRate, CartItem } from '../types/ecommerce';
import api from '../services/api';

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
  const addressRequestKey = [
    address.recipientName,
    address.phone,
    address.street,
    address.city,
    address.province,
    address.postalCode,
    address.areaId,
    address.areaName,
  ].join('|');

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
  }, [address.areaId, addressRequestKey, cart, onSelect]);

  useEffect(() => {
    return () => {
      latestRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    setSelected(null);
  }, [address]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleSelect = (rate: ShippingRate) => {
    setSelected(rate);
    onSelect(rate);
  };

  if (loading) {
    return <p className="text-sm text-black/60 py-2">Mengambil tarif pengiriman...</p>;
  }

  if (errorMessage) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">{errorMessage}</p>
        <button
          onClick={fetchRates}
          className="text-sm text-primary hover:underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!rates.length && emptyReason) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-black/60">{emptyMessage}</p>
        {emptyReason === 'provider_empty' && (
          <button
            onClick={fetchRates}
            className="text-sm text-primary hover:underline"
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
          key={`${rate.courier_code}-${rate.courier_service_code}-${i}`}
          className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${
            selected?.courier_code === rate.courier_code &&
            selected?.courier_service_code === rate.courier_service_code
              ? 'border-primary bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="shippingRate"
              checked={
                selected?.courier_code === rate.courier_code &&
                selected?.courier_service_code === rate.courier_service_code
              }
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
