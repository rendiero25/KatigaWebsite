import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { VoucherValidation, VoucherScopeItem } from '../types/ecommerce';
import { useVoucher } from '../hooks/useApi';

interface Props {
  subtotal: number;
  /** Rincian item; wajib agar voucher bercakupan produk/kategori dihitung benar. */
  items: VoucherScopeItem[];
  onApply: (validation: VoucherValidation, code: string) => void;
  onClear: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function VoucherInput({ subtotal, items, onApply, onClear }: Props) {
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
    await apply(code.trim(), subtotal, items);
  };

  const handleClear = () => {
    clear();
    setCode('');
    onClear();
  };

  return (
    <div className="space-y-2">
      {voucher?.valid ? (
        <div className="flex items-center justify-between border border-[#E9E9EA] px-4 py-3">
          <div>
            <p className="uppercase text-[13px] text-[#1E1E1E]">{code.toUpperCase()}</p>
            <p className="text-[13px] text-[#6F6F71]">Hemat {fmt(voucher.discountAmount ?? 0)}</p>
          </div>
          <button
            onClick={handleClear}
            className="text-[#6F6F71] hover:text-[#AE4B4B] transition-colors cursor-pointer"
            aria-label="Hapus voucher"
          >
            <X className="size-4" strokeWidth={1.5} />
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
            className="flex-1 border border-[#E9E9EA] px-4 py-3 text-sm uppercase focus:outline-none focus:border-[#1E1E1E]"
          />
          <button
            onClick={handleApply}
            disabled={applying || !code.trim()}
            className="px-6 py-3 bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] hover:bg-[#2B3A67] transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {applying ? '...' : 'Pakai'}
          </button>
        </div>
      )}
      {error && <p className="text-[13px] text-[#AE4B4B]">{error}</p>}
    </div>
  );
}
