import { Minus, Plus } from 'lucide-react';
import type { CartItem } from '../types/ecommerce';
import api from '../services/api';

interface Props {
  item: CartItem;
  selected: boolean;
  onToggle: () => void;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function CartItemCard({ item, selected, onToggle, onQtyChange, onRemove }: Props) {
  return (
    <div className="flex gap-4 items-start py-5 border-b border-[#E9E9EA]">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-1 w-4 h-4 accent-[#1E1E1E] shrink-0 cursor-pointer"
      />

      <div className="w-24 h-24 bg-[#F9F7F2] shrink-0 overflow-hidden">
        <img
          src={api.getImageUrl(item.image)}
          alt={item.name}
          className="w-24 h-24 object-cover"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1 min-w-0">
          <p className="uppercase text-[13px] text-[#1E1E1E] leading-snug mb-1">{item.name}</p>
          {item.variantName && (
            <p className="text-[13px] text-[#6F6F71] mb-1">{item.variantName}</p>
          )}
          {item.discountPercent !== undefined && item.originalPrice !== undefined && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-[#AE4B4B]">-{item.discountPercent}%</span>
              <span className="text-[13px] text-[#6F6F71] line-through">{fmt(item.originalPrice)}</span>
            </div>
          )}
          <p className="text-[13px] text-[#6F6F71]">{fmt(item.priceNumeric)}</p>
          <button
            onClick={onRemove}
            className="mt-2 uppercase tracking-[0.12em] text-[11px] text-[#6F6F71] hover:text-[#1E1E1E] underline underline-offset-2 cursor-pointer"
          >
            Hapus
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 md:justify-start">
          <div className="flex items-center border border-[#E9E9EA] md:w-28 md:justify-center">
            <button
              type="button"
              onClick={() => onQtyChange(item.quantity - 1)}
              aria-label={`Kurangi jumlah ${item.name}`}
              className="flex items-center justify-center w-7 h-7 text-[#1E1E1E] border-r border-[#E9E9EA] hover:bg-[#F9F7F2] transition-colors cursor-pointer"
            >
              <Minus className="size-3" strokeWidth={1.5} />
            </button>
            <span className="w-8 h-7 flex items-center justify-center text-[13px] text-[#1E1E1E] tabular-nums select-none">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onQtyChange(item.quantity + 1)}
              aria-label={`Tambah jumlah ${item.name}`}
              className="flex items-center justify-center w-7 h-7 text-[#1E1E1E] border-l border-[#E9E9EA] hover:bg-[#F9F7F2] transition-colors cursor-pointer"
            >
              <Plus className="size-3" strokeWidth={1.5} />
            </button>
          </div>

          <p className="text-[13px] text-[#1E1E1E] tabular-nums md:w-28 md:text-right">
            {fmt(item.priceNumeric * item.quantity)}
          </p>
        </div>
      </div>
    </div>
  );
}
