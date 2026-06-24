import { useState, useEffect } from 'react';
import type { VoucherValidation } from '../types/ecommerce';
import { useVoucher } from '../hooks/useApi';

interface Props {
  subtotal: number;
  onApply: (validation: VoucherValidation, code: string) => void;
  onClear: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function VoucherInput({ subtotal, onApply, onClear }: Props) {
  const [code, setCode] = useState('');
  const { voucher, applying, error, apply, clear } = useVoucher();

  useEffect(() => {
    if (voucher?.valid) {
      onApply(voucher, code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucher]);

  const handleApply = async () => {
    if (!code.trim()) return;
    await apply(code.trim(), subtotal);
  };

  const handleClear = () => {
    clear();
    setCode('');
    onClear();
  };

  return (
    <div className="space-y-2">
      {voucher?.valid ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-bold text-green-700">{code.toUpperCase()}</p>
            <p className="text-xs text-green-600">Hemat {fmt(voucher.discountAmount ?? 0)}</p>
          </div>
          <button
            onClick={handleClear}
            className="text-green-700 hover:text-red-600 transition text-lg leading-none"
            aria-label="Hapus voucher"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Kode voucher"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') handleApply(); }}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm uppercase"
          />
          <button
            onClick={handleApply}
            disabled={applying || !code.trim()}
            className="px-5 py-2.5 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition whitespace-nowrap"
          >
            {applying ? '...' : 'Pakai'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
